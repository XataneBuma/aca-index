
import React, { useState } from 'react';
import type { AcademicWork } from '../types';
import { SearchIcon, QuoteIcon, FileTextIcon, DownloadIcon } from './icons';

interface SearchTabProps {
  onSearch: (query: string) => void;
  searchResults: AcademicWork[];
  isSearching: boolean;
  errorMessage: string | null;
  searchAttempted: boolean;
}

const SearchBar: React.FC<{ onSearch: (query: string) => void, isSearching: boolean }> = ({ onSearch, isSearching }) => {
    const [query, setQuery] = useState('');

    const handleSearch = () => {
        onSearch(query);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Busca Semântica</h2>
            <div className="flex gap-4">
            <input
                type="text"
                placeholder="Digite palavras-chave, autor, título, ou uma ideia..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isSearching}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
            />
            <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
                {isSearching ? 'Buscando...' : <><SearchIcon size={20} /> Pesquisar</>}
            </button>
            </div>
        </div>
    );
};

const SearchResultCard: React.FC<{ work: AcademicWork, onSelect: () => void, onCite: () => void }> = ({ work, onSelect, onCite }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
        <h4 className="text-lg font-semibold text-indigo-600 mb-2">{work.titulo}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
        <div><span className="font-semibold text-gray-800">Autor:</span> {work.autor}</div>
        <div><span className="font-semibold text-gray-800">Ano:</span> {work.ano}</div>
        <div><span className="font-semibold text-gray-800">Universidade:</span> {work.universidade}</div>
        <div><span className="font-semibold text-gray-800">Departamento:</span> {work.departamento}</div>
        </div>
        <div className="mb-4">
        <span className="font-semibold text-gray-900">Palavras-chave:</span>
        <div className="flex flex-wrap gap-2 mt-2">
            {work.palavrasChave.map((kw, idx) => (
            <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                {kw}
            </span>
            ))}
        </div>
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button onClick={onSelect} className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2">
            <FileTextIcon size={18} />
            Ver Detalhes
        </button>
        <button onClick={onCite} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center gap-2">
            <QuoteIcon size={18} />
            Citar
        </button>
        </div>
    </div>
);

const NoResults: React.FC = () => (
    <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-600">
        <SearchIcon size={48} className="inline opacity-30 mb-4" />
        <p className="text-lg">Nenhum trabalho encontrado para sua busca.</p>
        <p className="text-sm text-gray-500">Tente usar termos diferentes ou mais gerais.</p>
    </div>
);

const WorkDetailsModal: React.FC<{ work: AcademicWork, onClose: () => void, onCite: () => void }> = ({ work, onClose, onCite }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{work.titulo}</h2>
                    <p className="text-gray-600 mt-2">{work.autor} ({work.ano})</p>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-light">&times;</button>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><p><span className="font-semibold text-gray-900">Supervisor:</span> {work.supervisor}</p></div>
                    <div><p><span className="font-semibold text-gray-900">Co-supervisor:</span> {work.coSupervisor || 'N/A'}</p></div>
                    <div><p><span className="font-semibold text-gray-900">Universidade:</span> {work.universidade}</p></div>
                    <div><p><span className="font-semibold text-gray-900">Faculdade:</span> {work.faculdade}</p></div>
                </div>
                <div>
                    <span className="font-semibold text-gray-900 block mb-2">Resumo:</span>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md border">{work.resumo}</p>
                </div>
                 <div className="flex gap-3 pt-4">
                    <button onClick={onCite} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                        <QuoteIcon size={20} /> Citar Trabalho
                    </button>
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Fechar</button>
                </div>
            </div>
        </div>
    </div>
);

const CitationModal: React.FC<{ work: AcademicWork, onClose: () => void }> = ({ work, onClose }) => {
    const citation = `${work.autor} (${work.ano}). "${work.titulo}". ${work.universidade}, ${work.faculdade}.`;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(citation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full animate-fade-in-up">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white rounded-t-lg">
                    <h2 className="text-2xl font-bold flex items-center gap-3"><QuoteIcon size={28} /> Citação do Trabalho</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Citação (Formato Harvard):</label>
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            <p className="text-gray-700 font-mono text-sm leading-relaxed">{citation}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleCopy} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                            <DownloadIcon size={20} /> {copied ? 'Copiado!' : 'Copiar Citação'}
                        </button>
                        <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SearchTab: React.FC<SearchTabProps> = ({ onSearch, searchResults, isSearching, errorMessage, searchAttempted }) => {
    const [selectedWork, setSelectedWork] = useState<AcademicWork | null>(null);
    const [showCiteModal, setShowCiteModal] = useState(false);

    const handleSelectWork = (work: AcademicWork) => {
        setSelectedWork(work);
        setShowCiteModal(false);
    }
    
    const handleCiteWork = (work: AcademicWork) => {
        setSelectedWork(work);
        setShowCiteModal(true);
    }
    
    const closeModal = () => {
        setSelectedWork(null);
        setShowCiteModal(false);
    }

    return (
        <div className="space-y-8">
            <SearchBar onSearch={onSearch} isSearching={isSearching} />

            {errorMessage && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                <p>{errorMessage}</p>
              </div>
            )}
            
            {isSearching && (
                <div className="text-center py-8">
                    <p className="text-lg text-indigo-600">Realizando busca semântica...</p>
                </div>
            )}
            
            {!isSearching && searchAttempted && (
                <div className="space-y-4">
                    {searchResults.length > 0 ? (
                        <>
                            <h3 className="text-lg font-bold text-gray-900">{searchResults.length} resultado(s) relevante(s) encontrado(s)</h3>
                            {searchResults.map((work) => (
                                <SearchResultCard 
                                    key={work.id} 
                                    work={work} 
                                    onSelect={() => handleSelectWork(work)}
                                    onCite={() => handleCiteWork(work)}
                                />
                            ))}
                        </>
                    ) : (
                        <NoResults />
                    )}
                </div>
            )}

            {selectedWork && !showCiteModal && (
                <WorkDetailsModal 
                    work={selectedWork} 
                    onClose={closeModal}
                    onCite={() => setShowCiteModal(true)}
                />
            )}
            {selectedWork && showCiteModal && (
                <CitationModal work={selectedWork} onClose={closeModal} />
            )}
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default SearchTab;
