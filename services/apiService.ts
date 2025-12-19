import type { AcademicWork, KeywordScore } from "../types";

const API_BASE_URL = "https://vividly-delegable-tula.ngrok-free.dev";

// ==================== TYPES ====================

export enum DocumentStatus {
  UPLOADED = "uploaded",
  METADATA_EXTRACTED = "metadata_extracted",
  PENDING_SUBMISSION = "pending_submission",
  SUBMITTED = "submitted",
  PROCESSING = "processing",
  INDEXED = "indexed",
  FAILED = "failed"
}

export interface QuickMetadata {
  title: string;
  authors: string[];
  date?: string;
  supervisor?: string;
  co_supervisor?: string;
  abstract: string;
  keywords: string[];
  institution?: string;
  department?: string;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  metadata: QuickMetadata;
  status: DocumentStatus;
  message: string;
}

export interface DocumentSubmission {
  document_id: string;
  metadata: QuickMetadata;
}

export interface DocumentStatusResponse {
  document_id: string;
  status: DocumentStatus;
  metadata?: QuickMetadata;
  progress_percentage: number;
  message: string;
  indexed_at?: string;
}

export interface SearchResult {
  document_id: number;
  title: string;
  authors: string[];
  abstract: string;
  similarity_score: number;
  keywords: string[];
}

// ==================== QUICK UPLOAD & EXTRACT ====================

export const uploadAndQuickExtract = async (
  file: File,
  maxPages: number = 8
): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("max_pages", maxPages.toString());

    const response = await fetch(`${API_BASE_URL}/upload/quick?max_pages=${maxPages}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading and extracting:", error);
    throw error;
  }
};

// ==================== DOCUMENT SUBMISSION ====================

export const submitDocument = async (
  submission: DocumentSubmission
): Promise<{ status: string; document_id: string; message: string; check_status_at: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error submitting document:", error);
    throw error;
  }
};

// ==================== DOCUMENT STATUS ====================

export const getDocumentStatus = async (
  documentId: string
): Promise<DocumentStatusResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching document status:", error);
    throw error;
  }
};

// ==================== LIST DOCUMENTS ====================

export const listDocuments = async (
  status?: DocumentStatus,
  skip: number = 0,
  limit: number = 20
): Promise<{ total: number; skip: number; limit: number; documents: any[] }> => {
  try {
    let url = `${API_BASE_URL}/documents?skip=${skip}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};

// ==================== SEARCH ====================

export const searchDocuments = async (
  query: string,
  k: number = 5,
  minScore: number = 0.6
): Promise<SearchResult[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        k,
        min_score: minScore,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching documents:", error);
    throw error;
  }
};

// ==================== WEBSOCKET ====================

export const createDocumentWebSocket = (
  documentId: string,
  onStatusUpdate: (data: {
    document_id: string;
    status: DocumentStatus;
    progress: number;
    message: string;
  }) => void,
  onError: (error: Event) => void
): WebSocket => {
  const wsUrl = `${API_BASE_URL.replace("https://", "wss://").replace("http://", "ws://")}/ws/${documentId}`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onStatusUpdate(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };
  
  ws.onerror = onError;
  
  return ws;
};

// ==================== HEALTH CHECK ====================

export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error during health check:", error);
    throw error;
  }
};

