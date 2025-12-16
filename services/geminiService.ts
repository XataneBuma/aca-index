
import { GoogleGenAI, Type } from "@google/genai";
import type { AcademicWork, ExtractedData } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
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
    supervisor: { type: Type.STRING, description: "O nome completo do supervisor/orientador." },
    coSupervisor: { type: Type.STRING, description: "O nome completo do co-supervisor, se houver." },
    resumo: { type: Type.STRING, description: "Um resumo conciso do trabalho." },
  },
  required: ["autor", "titulo", "universidade", "ano", "palavrasChave", "supervisor", "resumo"]
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
