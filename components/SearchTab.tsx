
import React, { useState } from 'react';
import type { AcademicWork } from '../types';
import { SearchIcon, QuoteIcon, FileTextIcon, DownloadIcon } from './icons';
import PDFViewer from './PDFViewer';

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

const SearchResultCard: React.FC<{ work: AcademicWork, onSelect: () => void, onCite: () => void, onDownload: () => void }> = ({ work, onSelect, onCite, onDownload }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start mb-2">
            <h4 className="text-lg font-semibold text-indigo-600 flex-1">{work.titulo}</h4>
            {work.relevanceScore !== undefined && (
                <div className="ml-4 text-right">
                    <div className="text-sm font-semibold text-gray-600">Relevância</div>
                    <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" 
                                style={{ width: `${(work.relevanceScore * 100).toFixed(1)}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-green-600">{(work.relevanceScore * 100).toFixed(1)}%</span>
                    </div>
                </div>
            )}
        </div>
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
        <button onClick={onDownload} className="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-semibold hover:bg-green-100 transition flex items-center gap-2">
            <DownloadIcon size={18} />
            Descarregar
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

const WorkDetailsModal: React.FC<{ work: AcademicWork, onClose: () => void, onCite: () => void, onDownload: () => void }> = ({ work, onClose, onCite, onDownload }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'entities' | 'similar' | 'distribution' | 'pdf'>('overview');

    const generateKeywords = (): any[] => {
        if (work.keywords) return work.keywords;
        // Generate mock YAKE scores based on keyword frequency
        const keywordFreq: Record<string, number> = {};
        work.palavrasChave.forEach(kw => {
            keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
        });
        return Object.entries(keywordFreq)
            .map(([keyword, freq]) => ({
                keyword,
                score: Math.min(0.99, 1 - (freq / (work.palavrasChave.length + 1)))
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    };

    const generateEntities = (): Record<string, string[]> => {
        if (work.entities) return work.entities;
        return {
            PER: [work.autor, work.supervisor, work.coSupervisor].filter(Boolean),
            ORG: [work.universidade, work.faculdade].filter(Boolean),
            LOC: []
        };
    };

    const generateSimilarDocs = (): AcademicWork[] => {
        if (work.similarDocuments) return work.similarDocuments;
        // Return empty array for similar documents (would be populated by API)
        return [];
    };

    const getKeywordDistribution = () => {
        const freq: Record<string, number> = {};
        work.palavrasChave.forEach(kw => {
            freq[kw] = (freq[kw] || 0) + 1;
        });
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{work.titulo}</h2>
                        <p className="text-gray-600 mt-2">{work.autor} ({work.ano})</p>
                        {work.relevanceScore !== undefined && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-sm text-gray-600">Relevância:</span>
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" 
                                        style={{ width: `${(work.relevanceScore * 100).toFixed(1)}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-green-600">{(work.relevanceScore * 100).toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-light">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50 px-6 sticky top-[120px] z-10">
                    {[
                        { id: 'overview', label: 'Visão Geral' },
                        { id: 'keywords', label: 'Palavras-chave' },
                        { id: 'entities', label: 'Entidades' },
                        { id: 'similar', label: 'Similares' },
                        { id: 'distribution', label: 'Distribuição' },
                        { id: 'pdf', label: 'PDF' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-3 font-medium text-sm transition ${
                                activeTab === tab.id
                                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><p><span className="font-semibold text-gray-900">Supervisor:</span> {work.supervisor}</p></div>
                                <div><p><span className="font-semibold text-gray-900">Co-supervisor:</span> {work.coSupervisor || 'N/A'}</p></div>
                                <div><p><span className="font-semibold text-gray-900">Universidade:</span> {work.universidade}</p></div>
                                <div><p><span className="font-semibold text-gray-900">Faculdade:</span> {work.faculdade}</p></div>
                                <div><p><span className="font-semibold text-gray-900">Departamento:</span> {work.departamento}</p></div>
                                <div><p><span className="font-semibold text-gray-900">Ano:</span> {work.ano}</p></div>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-900 block mb-2">Resumo:</span>
                                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md border">{work.resumo}</p>
                            </div>
                        </div>
                    )}

                    {/* Keywords Tab */}
                    {activeTab === 'keywords' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Top 10 Palavras-chave (YAKE!)</h3>
                            <div className="space-y-3">
                                {generateKeywords().map((kw, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <span className="font-medium text-gray-900">{kw.keyword}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" 
                                                    style={{ width: `${((1 - kw.score) * 100).toFixed(0)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-blue-600 w-12 text-right">{kw.score.toFixed(3)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entities Tab */}
                    {activeTab === 'entities' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Entidades Nomeadas</h3>
                            {Object.entries(generateEntities()).map(([type, entities]) => (
                                entities.length > 0 && (
                                    <div key={type}>
                                        <h4 className="font-semibold text-gray-800 mb-2 text-sm uppercase text-indigo-600">{type === 'PER' ? 'Pessoas' : type === 'ORG' ? 'Organizações' : 'Localizações'}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {entities.map((entity, idx) => (
                                                <span key={idx} className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">
                                                    {entity}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {/* Similar Documents Tab */}
                    {activeTab === 'similar' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Top 5 Documentos Similares</h3>
                            {generateSimilarDocs().length > 0 ? (
                                <div className="space-y-3">
                                    {generateSimilarDocs().map((doc, idx) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-semibold text-indigo-600">{doc.titulo}</h5>
                                                {doc.relevanceScore && (
                                                    <span className="text-sm font-bold text-green-600">{(doc.relevanceScore * 100).toFixed(1)}%</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{doc.autor} ({doc.ano})</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Nenhum documento similar encontrado ainda.</p>
                            )}
                        </div>
                    )}

                    {/* Keyword Distribution Tab */}
                    {activeTab === 'distribution' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Distribuição de Palavras-chave por Frequência</h3>
                            <div className="space-y-3">
                                {getKeywordDistribution().map(([keyword, freq], idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <span className="font-medium text-gray-900">{keyword}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full" 
                                                    style={{ width: `${(freq / (Math.max(...getKeywordDistribution().map(x => x[1])) + 1)) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-purple-600 w-8 text-right">{freq}x</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PDF Tab */}
                    {activeTab === 'pdf' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Pré-visualização de PDF</h3>
                            {work.pdfFile ? (
                                <PDFViewer 
                                    file={work.pdfFile}
                                    height="600px"
                                    onLoadSuccess={(numPages) => console.log(`PDF loaded with ${numPages} pages`)}
                                    onLoadError={(error) => console.error('PDF load error:', error)}
                                />
                            ) : work.pdfUrl ? (
                                <PDFViewer 
                                    file={work.pdfUrl}
                                    height="600px"
                                    onLoadSuccess={(numPages) => console.log(`PDF loaded with ${numPages} pages`)}
                                    onLoadError={(error) => console.error('PDF load error:', error)}
                                />
                            ) : (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                                    <FileTextIcon size={48} className="inline opacity-30 mb-4" />
                                    <p className="text-gray-500 mt-4">Nenhum PDF disponível para pré-visualização.</p>
                                    <p className="text-sm text-gray-400 mt-2">O documento original não está disponível.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
                    <button onClick={onDownload} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2">
                        <DownloadIcon size={20} /> Descarregar PDF
                    </button>
                    <button onClick={onCite} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                        <QuoteIcon size={20} /> Citar Trabalho
                    </button>
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Fechar</button>
                </div>
            </div>
        </div>
    );
};

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
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const handleSelectWork = (work: AcademicWork) => {
        setSelectedWork(work);
        setShowCiteModal(false);
    }
    
    const handleCiteWork = (work: AcademicWork) => {
        setSelectedWork(work);
        setShowCiteModal(true);
    }

    const handleDownloadPDF = (work: AcademicWork) => {
        setDownloadingId(work.id);
        
        // Simulate PDF download
        setTimeout(() => {
            // Create a mock PDF download
            const element = document.createElement('a');
            const file = new Blob(
                [`Título: ${work.titulo}\nAutor: ${work.autor}\nAno: ${work.ano}\n\n${work.resumo}`],
                { type: 'application/pdf' }
            );
            element.href = URL.createObjectURL(file);
            element.download = `${work.titulo.substring(0, 30)}.pdf`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            URL.revokeObjectURL(element.href);
            
            setDownloadingId(null);
        }, 300);
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
                                    onDownload={() => handleDownloadPDF(work)}
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
                    onDownload={() => handleDownloadPDF(selectedWork)}
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
