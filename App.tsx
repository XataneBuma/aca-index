
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
import { indexDocument } from './services/geminiService';
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
  const [currentPdfFile, setCurrentPdfFile] = useState<File | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processingWebSocket, setProcessingWebSocket] = useState<WebSocket | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadState('processing');
    setErrorMessage(null);
    setProcessingMessage('📤 Iniciando o pipeline preliminar...');
    setProcessingProgress(10);
    setCurrentPdfFile(file); // Store the PDF file
    
    try {
      // Upload and extract using Gemini API
      const uploadResponse = await uploadAndQuickExtract(file, 8);
      setCurrentDocumentId(uploadResponse.document_id);
      setProcessingProgress(50);
      setProcessingMessage('✓ Metadados extraídos com sucesso');
      
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
      setErrorMessage(`❌ Erro ao processar o pipeline: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Verifique se a API_KEY está configurada corretamente.`);
      setUploadState('idle');
    }
  }, []);

  const handleSubmitWork = useCallback(async (finalData: ExtractedData) => {
    if (!currentDocumentId) {
      setErrorMessage("Erro: ID do documento não encontrado");
      return;
    }

    setUploadState('submitting');
    setProcessingMessage('A indexar documento...');
    setProcessingProgress(20);
    
    try {
      // Index the document in local state immediately with the PDF file
      const indexedWork = await indexDocument(finalData, currentPdfFile || undefined);
      setIndexedWorks(prev => [...prev, indexedWork]);
      
      setProcessingProgress(40);
      setProcessingMessage('A submeter metadata ao servidor...');

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

      setProcessingProgress(60);
      setProcessingMessage('A processar no servidor...');

      // Set up WebSocket to monitor processing
      const { createDocumentWebSocket } = await import('./services/apiService');
      const ws = createDocumentWebSocket(
        currentDocumentId,
        (data) => {
          setProcessingProgress(60 + Math.min(data.progress * 0.4, 39));
          setProcessingMessage(data.message || 'A processar...');
          
          // Check if processing is complete
          if (data.status === DocumentStatus.INDEXED) {
            setProcessingProgress(100);
            setProcessingMessage('Documento indexado com sucesso!');
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
          setErrorMessage("Erro na conexão em tempo real. O documento foi salvo localmente.");
          setUploadState('success');
          setTimeout(() => {
            setUploadState('idle');
            setExtractedData(null);
            setCurrentDocumentId(null);
          }, 3000);
        }
      );
      
      setProcessingWebSocket(ws);
    } catch (error) {
      console.error("Error submitting document:", error);
      setErrorMessage("Falha ao submeter documento. Por favor, tente novamente.");
      setUploadState('idle');
    }
  }, [currentDocumentId, currentPdfFile]);

  const handleCancelUpload = useCallback(() => {
    setUploadState('idle');
    setExtractedData(null);
    setErrorMessage(null);
    setCurrentDocumentId(null);
    setCurrentPdfFile(null);
    if (processingWebSocket) {
      processingWebSocket.close();
    }
  }, [processingWebSocket]);

  const handleSearch = useCallback(async (query: string) => {
      if (!query.trim()) return;
      setIsSearching(true);
      setSearchAttempted(true);
      setErrorMessage(null);
      
      // Import the real relevance calculation functions outside try/catch
      const { calculateSemanticRelevance, findSimilarDocuments } = await import('./services/geminiService');
      
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

        // Merge with local indexed works and deduplicate
        const mergedResults = [...results];
        const apiIds = new Set(apiResults.map(r => r.document_id));
        
        const localResults = indexedWorks
          .filter(work => !apiIds.has(work.id as any))
          .map(work => {
            // Use real semantic relevance calculation
            const relevanceScore = calculateSemanticRelevance(query, work);
            return { ...work, relevanceScore };
          })
          .filter(work => work.relevanceScore > 0.05) // Filter very low relevance
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        
        const finalResults = [...mergedResults, ...localResults]
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
          .slice(0, 20)
          .map(work => {
            // Add similar documents for each result
            return {
              ...work,
              similarDocuments: findSimilarDocuments(work, indexedWorks, 5)
            };
          });
        
        setSearchResults(finalResults);
      } catch (error) {
        console.error("Error during search:", error);
        // Fallback to local indexed search with real relevance calculation
        const filteredResults = indexedWorks
          .map(work => {
            // Use real semantic relevance calculation
            const relevanceScore = calculateSemanticRelevance(query, work);
            return { ...work, relevanceScore };
          })
          .filter(work => work.relevanceScore > 0.05)
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
          .map(work => ({
            ...work,
            similarDocuments: findSimilarDocuments(work, indexedWorks, 5)
          }));
        
        setSearchResults(filteredResults.length > 0 ? filteredResults : indexedWorks.slice(0, 5).map((w, i) => ({
          ...w,
          relevanceScore: 0.85 - (i * 0.1),
          similarDocuments: findSimilarDocuments(w, indexedWorks, 5)
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
            processingProgress={processingProgress}
            processingMessage={processingMessage}
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
          <CacheTab apiUrl="https://vividly-delegable-tula.ngrok-free.dev" indexedWorks={indexedWorks}/>
        )}
        
      </main>
      
    </div>
    
  );
}
