import { GoogleGenAI, Type } from "@google/genai";
import type { AcademicWork, ExtractedData, KeywordScore } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable is not set in .env file.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

// ==================== KEYWORD EXTRACTION & SCORING ====================

/**
 * Simple YAKE-like keyword extraction using TF-IDF
 * Returns keywords with relevance scores (0-1, higher is better)
 */
export const extractKeywordsWithScores = (text: string, numKeywords: number = 10): KeywordScore[] => {
  // Tokenize and clean text
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3); // Filter out short words

  // Calculate term frequency
  const termFreq: Record<string, number> = {};
  words.forEach(word => {
    termFreq[word] = (termFreq[word] || 0) + 1;
  });

  // Filter common stopwords
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'que', 'de', 'e', 'o', 'a', 'em', 'para', 'com', 'por', 'este', 'esse', 'um', 'uma', 'os', 'as',
    'é', 'são', 'ser', 'estar', 'ter', 'fazer', 'dar', 'como', 'mais', 'muito', 'já', 'ele', 'ela'
  ]);

  // Calculate TF-IDF-like scores (simplified YAKE)
  const keywordScores: KeywordScore[] = Object.entries(termFreq)
    .filter(([word]) => !stopwords.has(word) && word.length > 3)
    .map(([keyword, freq]) => {
      // YAKE score: lower is better, so we invert for our use case (higher = better)
      // TF component (normalized by total words)
      const tf = freq / words.length;
      // Inverse document frequency-like component
      const idf = Math.log(words.length / (freq + 1));
      // Combined score (0-1 range)
      const score = Math.min(1, tf * idf);
      return { keyword, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, numKeywords);

  return keywordScores;
};

// ==================== SIMILARITY CALCULATION ====================

/**
 * Calculate Jaccard similarity between two sets of keywords
 */
const calculateJaccardSimilarity = (set1: string[], set2: string[]): number => {
  const s1 = new Set(set1.map(s => s.toLowerCase()));
  const s2 = new Set(set2.map(s => s.toLowerCase()));
  
  const intersection = new Set([...s1].filter(x => s2.has(x)));
  const union = new Set([...s1, ...s2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

/**
 * Calculate cosine similarity between two text documents
 */
const calculateCosineSimilarity = (text1: string, text2: string): number => {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Create term vectors
  const allWords = new Set([...words1, ...words2]);
  const vec1: Record<string, number> = {};
  const vec2: Record<string, number> = {};
  
  allWords.forEach(word => {
    vec1[word] = words1.filter(w => w === word).length;
    vec2[word] = words2.filter(w => w === word).length;
  });
  
  // Calculate cosine similarity
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  Object.keys(vec1).forEach(word => {
    dotProduct += (vec1[word] || 0) * (vec2[word] || 0);
    mag1 += (vec1[word] || 0) ** 2;
    mag2 += (vec2[word] || 0) ** 2;
  });
  
  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

/**
 * Find similar documents based on keyword and content similarity
 */
export const findSimilarDocuments = (
  work: AcademicWork,
  allWorks: AcademicWork[],
  limit: number = 5
): AcademicWork[] => {
  const similarities = allWorks
    .filter(w => w.id !== work.id) // Exclude the work itself
    .map(otherWork => {
      // Keyword overlap (Jaccard similarity)
      const keywordSimilarity = calculateJaccardSimilarity(
        work.palavrasChave,
        otherWork.palavrasChave
      );
      
      // Content similarity (cosine similarity of abstracts)
      const contentSimilarity = calculateCosineSimilarity(
        work.resumo,
        otherWork.resumo
      );
      
      // Department/field similarity
      const deptSimilarity = (
        work.departamento.toLowerCase() === otherWork.departamento.toLowerCase()
      ) ? 0.5 : 0;
      
      // Combined similarity score
      const overallSimilarity = 
        (keywordSimilarity * 0.5) + 
        (contentSimilarity * 0.3) + 
        (deptSimilarity * 0.2);
      
      return {
        work: otherWork,
        similarity: overallSimilarity
      };
    })
    .filter(item => item.similarity > 0.1) // Filter out very dissimilar documents
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(item => ({
      ...item.work,
      relevanceScore: item.similarity // Use similarity as relevance score
    }));
  
  return similarities;
};

// ==================== SEMANTIC SEARCH ====================

/**
 * Calculate semantic relevance between query and document
 */
export const calculateSemanticRelevance = (
  query: string,
  work: AcademicWork
): number => {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const titleWords = work.titulo.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const keywordWords = work.palavrasChave.map(k => k.toLowerCase());
  const abstractWords = work.resumo.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  let score = 0;
  
  // Check for exact keyword matches (highest weight)
  const keywordMatches = queryWords.filter(qw => 
    keywordWords.some(kw => kw.includes(qw) || qw === kw)
  ).length;
  score += (keywordMatches / Math.max(queryWords.length, 1)) * 0.4;
  
  // Check for title matches
  const titleMatches = queryWords.filter(qw => 
    titleWords.some(tw => tw.includes(qw) || qw === tw)
  ).length;
  score += (titleMatches / Math.max(queryWords.length, 1)) * 0.3;
  
  // Check for abstract matches
  const abstractMatches = queryWords.filter(qw => 
    abstractWords.some(aw => aw.includes(qw) || qw === aw)
  ).length;
  score += (abstractMatches / Math.max(queryWords.length, 1)) * 0.2;
  
  // Jaccard similarity on keywords
  const keywordSimilarity = calculateJaccardSimilarity(
    queryWords,
    keywordWords
  );
  score += keywordSimilarity * 0.1;
  
  return Math.min(score, 0.99);
};

const metadataSchema = {
  type: Type.OBJECT,
  properties: {
    autor: { type: Type.STRING, description: "Nome completo do autor principal." },
    titulo: { type: Type.STRING, description: "O título completo do trabalho acadêmico." },
    universidade: { type: Type.STRING, description: "A universidade onde o trabalho foi submetido." },
    faculdade: { type: Type.STRING, description: "A faculdade ou instituto." },
    departamento: { type: Type.STRING, description: "O departamento específico." },
    ano: { type: Type.INTEGER, description: "O ano de submissão ou defesa." },
    palavrasChave: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Uma lista de palavras-chave relevantes."
    },
    supervisor: { type: Type.STRING, description: "O nome completo do supervisor/orientador e o grau." },
    coSupervisor: { type: Type.STRING, description: "O nome completo do co-supervisor, se houver." },
    resumo: { type: Type.STRING, description: "Um resumo conciso do trabalho." },
  },
  required: ["autor", "titulo", "universidade", "faculdade", "ano", "palavrasChave", "supervisor", "resumo"]
};

export const extractMetadataFromFile = async (file: File): Promise<ExtractedData> => {
  const imagePart = await fileToGenerativePart(file);
  const prompt = `Você é um assistente especialista em indexação de documentos acadêmicos. Analise o documento fornecido e extraia os seguintes metadados: autor, título, universidade, faculdade, departamento, ano de submissão, palavras-chave, supervisor, co-supervisor e um resumo. Retorne os dados em um formato JSON estruturado. Se um campo opcional como 'coSupervisor', 'faculdade' ou 'departamento' não for encontrado, retorne uma string vazia para ele.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: metadataSchema,
    },
  });

  const text = response.text.trim();
  const parsedJson = JSON.parse(text);

  // Gemini sometimes returns palavrasChave as a single string.
  if (typeof parsedJson.palavrasChave === 'string') {
    parsedJson.palavrasChave = parsedJson.palavrasChave.split(/, |; | /).map((kw: string) => kw.trim()).filter(Boolean);
  }

  return parsedJson as ExtractedData;
};

export const indexDocument = async (data: ExtractedData, pdfFile?: File): Promise<AcademicWork> => {
  // Create an indexed AcademicWork from ExtractedData
  const fullText = `${data.titulo} ${data.resumo} ${data.palavrasChave.join(' ')}`;
  
  const newWork: AcademicWork = {
    id: Date.now(), // Generate unique ID based on timestamp
    ...data,
    pdfFile: pdfFile, // Store the PDF file for preview
    keywords: extractKeywordsWithScores(fullText, 10), // Extract real keywords
    indexed: true,
    indexedAt: new Date().toISOString(),
  };
  return newWork;
};

const searchResultSchema = {
    type: Type.OBJECT,
    properties: {
        relevantIds: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "An array of numeric IDs of the most relevant documents, ordered by relevance."
        }
    },
    required: ["relevantIds"]
}

export const semanticSearch = async (query: string, works: AcademicWork[]): Promise<AcademicWork[]> => {
  if (works.length === 0) {
    return [];
  }

  const worksForSearch = works.map(({ id, titulo, resumo, palavrasChave }) => ({
    id,
    titulo,
    resumo,
    palavrasChave
  }));

  const prompt = `Você é um motor de busca semântica para um repositório acadêmico. Um utilizador pesquisou por: "${query}". Com base nesta consulta, analise a lista de trabalhos acadêmicos fornecida e retorne uma lista dos IDs dos trabalhos mais relevantes, ordenados do mais para o menos relevante.

  Aqui estão os trabalhos disponíveis (em formato JSON):
  ${JSON.stringify(worksForSearch)}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: searchResultSchema,
    },
  });
  
  const text = response.text.trim();
  const result = JSON.parse(text) as { relevantIds: number[] };
  const relevantIds = result.relevantIds;

  const relevantWorks = relevantIds
    .map(id => works.find(work => work.id === id))
    .filter((work): work is AcademicWork => work !== undefined);

  return relevantWorks;
};
