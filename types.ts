
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
}

export type ExtractedData = Omit<AcademicWork, 'id'>;

export type UploadState = 'idle' | 'processing' | 'verifying' | 'submitting' | 'success';

export type Tab = 'upload' | 'search';
