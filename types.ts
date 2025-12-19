

export interface AcademicWork {
  id: number;
  titulo: string;
  autor: string;
  universidade: string;
  faculdade: string;
  departamento: string;
  ano: number;
  palavrasChave: string[];
  supervisor: string;
  coSupervisor: string;
  resumo: string;
  relevanceScore?: number;
  keywords?: KeywordScore[];
  entities?: Record<string, string[]>;
  similarDocuments?: AcademicWork[];
  pdfUrl?: string;
}

export interface KeywordScore {
  keyword: string;
  score: number;
}

export type ExtractedData = Omit<AcademicWork, 'id' | 'relevanceScore' | 'keywords' | 'entities' | 'similarDocuments' | 'pdfUrl'>;

export type UploadState = 'idle' | 'processing' | 'verifying' | 'submitting' | 'success';

export type Tab = 'upload' | 'search';
