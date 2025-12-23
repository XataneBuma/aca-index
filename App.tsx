
import React, { useState, useCallback, useEffect } from 'react';
import { AcademicWork, Tab, UploadState, ExtractedData } from './types';
import CacheTab from './components/CacheTab';
import { 
  uploadAndQuickExtract, 
  submitDocument, 
  getDocumentStatus, 
  searchDocuments as searchAPI,
  DocumentStatus,
  QuickMetadata 
} from './services/apiService';
import { SearchIcon, UploadIcon } from './components/icons';
import UploadTab from './components/UploadTab';
import SearchTab from './components/SearchTab';

// Mock data to start with
const existingWorks: AcademicWork[] = [
    {
      id: 1,
      titulo: 'Aplicação de Machine Learning em Análise de Sentimento de Redes Sociais',
      autor: 'João Silva',
      universidade: 'Universidade Eduardo Mondlane',
      faculdade: 'Engenharia',
      departamento: 'Informática',
      ano: 2023,
      palavrasChave: ['machine learning', 'sentiment analysis', 'social media'],
      supervisor: 'Dr. Carlos Maia',
      coSupervisor: 'Dra. Marta Santos',
      resumo: 'Este trabalho explora técnicas de aprendizado automático aplicadas à análise de sentimentos em plataformas de redes sociais para extrair opiniões e tendências do público, utilizando modelos como SVM e Redes Neurais Recorrentes.'
    },
    {
      id: 2,
      titulo: 'Sustentabilidade Ambiental em Projectos de Energias Renováveis em Moçambique',
      autor: 'Maria Joaquina',
      universidade: 'Universidade de São Paulo',
      faculdade: 'Ciências Agrárias',
      departamento: 'Engenharia Ambiental',
      ano: 2024,
      palavrasChave: ['energia renovável', 'sustentabilidade', 'ambiente', 'moçambique'],
      supervisor: 'Prof. Amâncio Costa',
      coSupervisor: 'Prof. Helena Dias',
      resumo: 'Investigação sobre o impacto ambiental de projectos de energia solar e eólica em Moçambique, focando em estratégias para mitigar efeitos negativos e promover o desenvolvimento sustentável na matriz energética do país.'
    }
];

const Header: React.FC = () => (
  <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Indexação Semântica</h1>
          <p className="text-gray-600 mt-1">Sistema de Extração de Trabalhos Acadêmicos</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Utilizador:</div>
          <div className="text-lg font-semibold text-indigo-600">Convidado</div>
        </div>
      </div>
    </div>
  </header>
);

interface TabsProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => (
    <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-2 border-b-2 font-medium transition flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <UploadIcon size={20} />
              Submeter Trabalho
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-2 border-b-2 font-medium transition flex items-center gap-2 ${
                activeTab === 'search'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <SearchIcon size={20} />
              Pesquisar Trabalhos
            </button>
            <button
            onClick={() => setActiveTab('cache')}
            className={`py-4 px-2 border-b-2 font-medium transition flex items-center gap-2 ${
              activeTab === 'cache'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Gerenciar Cache
          </button>

          </div>
        </div>
      </div>
);
export type Tab = 'upload' | 'search' | 'cache';
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [indexedWorks, setIndexedWorks] = useState<AcademicWork[]>(existingWorks);
  const [searchResults, setSearchResults] = useState<AcademicWork[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  // New state for incremental processing
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processingWebSocket, setProcessingWebSocket] = useState<WebSocket | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadState('processing');
    setErrorMessage(null);
    try {
      // Quick extract metadata from first 8 pages
      const uploadResponse = await uploadAndQuickExtract(file, 8);
      setCurrentDocumentId(uploadResponse.document_id);
      
      // Convert QuickMetadata to ExtractedData format
      setExtractedData({
        titulo: uploadResponse.metadata.title,
        autor: uploadResponse.metadata.authors?.[0] || '',
        universidade: uploadResponse.metadata.institution || '',
        faculdade: '',
        departamento: uploadResponse.metadata.department || '',
        ano: uploadResponse.metadata.date ? parseInt(uploadResponse.metadata.date) : new Date().getFullYear(),
        palavrasChave: uploadResponse.metadata.keywords || [],
        supervisor: uploadResponse.metadata.supervisor || '',
        coSupervisor: uploadResponse.metadata.co_supervisor || '',
        resumo: uploadResponse.metadata.abstract,
      });
      setUploadState('verifying');
    } catch (error) {
      console.error("Error uploading document:", error);
      setErrorMessage("Falha ao fazer upload do documento. Por favor, tente novamente com um ficheiro diferente.");
      setUploadState('idle');
    }
  }, []);

  const handleSubmitWork = useCallback(async (finalData: ExtractedData) => {
    if (!currentDocumentId) {
      setErrorMessage("Erro: ID do documento não encontrado");
      return;
    }

    setUploadState('submitting');
    
    try {
      // Submit metadata to backend
      await submitDocument({
        document_id: currentDocumentId,
        metadata: {
          title: finalData.titulo,
          authors: [finalData.autor],
          supervisor: finalData.supervisor,
          co_supervisor: finalData.coSupervisor,
          abstract: finalData.resumo,
          keywords: finalData.palavrasChave,
          institution: finalData.universidade,
          department: finalData.departamento,
        } as QuickMetadata
      });

      // Set up WebSocket to monitor processing
      const { createDocumentWebSocket } = await import('./services/apiService');
      const ws = createDocumentWebSocket(
        currentDocumentId,
        (data) => {
          setProcessingProgress(data.progress);
          setProcessingMessage(data.message);
          
          // Check if processing is complete
          if (data.status === DocumentStatus.INDEXED) {
            setUploadState('success');
            setTimeout(() => {
              setUploadState('idle');
              setExtractedData(null);
              setCurrentDocumentId(null);
              setProcessingProgress(0);
              setProcessingMessage('');
              ws.close();
            }, 3000);
          }
        },
        (error) => {
          console.error("WebSocket error:", error);
          setErrorMessage("Erro na conexão em tempo real");
        }
      );
      
      setProcessingWebSocket(ws);
    } catch (error) {
      console.error("Error submitting document:", error);
      setErrorMessage("Falha ao submeter documento. Por favor, tente novamente.");
      setUploadState('idle');
    }
  }, [currentDocumentId]);

  const handleCancelUpload = useCallback(() => {
    setUploadState('idle');
    setExtractedData(null);
    setErrorMessage(null);
    setCurrentDocumentId(null);
    if (processingWebSocket) {
      processingWebSocket.close();
    }
  }, [processingWebSocket]);

  const handleSearch = useCallback(async (query: string) => {
      if (!query.trim()) return;
      setIsSearching(true);
      setSearchAttempted(true);
      setErrorMessage(null);
      
      try {
        // Try to fetch from API
        const apiResults = await searchAPI(query, 10);
        
        // Transform API results to AcademicWork with relevance scores
        const results = apiResults.map((result, idx) => ({
          id: result.document_id,
          titulo: result.title,
          autor: result.authors?.[0] || 'Desconhecido',
          universidade: '',
          faculdade: '',
          departamento: '',
          ano: new Date().getFullYear(),
          palavrasChave: result.keywords || [],
          supervisor: '',
          coSupervisor: '',
          resumo: result.abstract,
          relevanceScore: result.similarity_score,
        }));
        
        setSearchResults(results);
      } catch (error) {
        console.error("Error during search:", error);
        // Fallback to local mock search
        const filteredResults = indexedWorks
          .map(work => {
            // Calculate relevance score based on matches
            let score = 0;
            const queryLower = query.toLowerCase();
            
            if (work.titulo.toLowerCase().includes(queryLower)) score += 0.3;
            if (work.autor.toLowerCase().includes(queryLower)) score += 0.2;
            if (work.resumo.toLowerCase().includes(queryLower)) score += 0.2;
            
            const keywordMatches = work.palavrasChave.filter(kw => 
              kw.toLowerCase().includes(queryLower)
            ).length;
            score += (keywordMatches / Math.max(work.palavrasChave.length, 1)) * 0.3;
            
            return { ...work, relevanceScore: Math.min(score, 0.99) };
          })
          .filter(work => work.relevanceScore > 0)
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        
        setSearchResults(filteredResults.length > 0 ? filteredResults : indexedWorks.slice(0, 5).map((w, i) => ({
          ...w,
          relevanceScore: 0.85 - (i * 0.1)
        })));
      } finally {
        setIsSearching(false);
      }
  }, [indexedWorks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-800">
      <Header />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'upload' && (
          <UploadTab
            uploadState={uploadState}
            extractedData={extractedData}
            errorMessage={errorMessage}
            onFileUpload={handleFileUpload}
            onSubmitWork={handleSubmitWork}
            onCancel={handleCancelUpload}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab 
            onSearch={handleSearch}
            searchResults={searchResults}
            isSearching={isSearching}
            errorMessage={errorMessage}
            searchAttempted={searchAttempted}
          />
        )}
        {activeTab === 'cache' && (
          <CacheTab apiUrl="https://vividly-delegable-tula.ngrok-free.dev"/>
        )}
        
      </main>
      
    </div>
    
  );
}
