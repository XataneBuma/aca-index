
import React, { useState, useCallback } from 'react';
import { AcademicWork, Tab, UploadState, ExtractedData } from './types';
import { extractMetadataFromFile, semanticSearch } from './services/geminiService';
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

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadState('processing');
    setErrorMessage(null);
    try {
      const data = await extractMetadataFromFile(file);
      setExtractedData(data);
      setUploadState('verifying');
    } catch (error) {
      console.error("Error extracting metadata:", error);
      setErrorMessage("Falha ao extrair dados do documento. Por favor, tente novamente com um ficheiro diferente.");
      setUploadState('idle');
    }
  }, []);

  const handleSubmitWork = useCallback((finalData: ExtractedData) => {
    setUploadState('submitting');
    // Simulate API call to save the work
    setTimeout(() => {
        const newWork: AcademicWork = {
            ...finalData,
            id: Date.now(), // simple unique id
        };
        setIndexedWorks(prevWorks => [newWork, ...prevWorks]);
        setUploadState('success');

        setTimeout(() => {
            setUploadState('idle');
            setExtractedData(null);
        }, 4000);
    }, 1500);
  }, []);

  const handleCancelUpload = useCallback(() => {
    setUploadState('idle');
    setExtractedData(null);
    setErrorMessage(null);
  }, []);
  
  const handleSearch = useCallback(async (query: string) => {
      if (!query.trim()) return;
      setIsSearching(true);
      setSearchAttempted(true);
      setErrorMessage(null);
      try {
          const results = await semanticSearch(query, indexedWorks);
          setSearchResults(results);
      } catch (error) {
          console.error("Error during semantic search:", error);
          setErrorMessage("Ocorreu um erro durante a pesquisa. Por favor, tente novamente.");
          setSearchResults([]);
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
      </main>
    </div>
  );
}
