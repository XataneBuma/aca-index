import React, { useState, useEffect } from 'react';
import { FileTextIcon, DownloadIcon, SearchIcon } from './icons';
import type { AcademicWork } from '../types';

// ==================== TIPOS ====================

interface CachedDocument {
  doc_hash: string;
  filename: string;
  cached_at: string;
  has_embeddings: boolean;
  title: string;
  authors: string[];
}

interface CacheStats {
  total_documents: number;
  total_size_mb: number;
  cache_directory: string;
  last_updated: string;
}

interface CacheTabProps {
  apiUrl: string;
  indexedWorks?: AcademicWork[];
}

// ==================== COMPONENTES ====================

const CacheStatsCard: React.FC<{ stats: CacheStats | null }> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
        <div className="text-sm opacity-90 mb-2">Total de Documentos</div>
        <div className="text-4xl font-bold">{stats.total_documents}</div>
      </div>
      
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
        <div className="text-sm opacity-90 mb-2">Tamanho do Cache</div>
        <div className="text-4xl font-bold">{stats.total_size_mb} MB</div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
        <div className="text-sm opacity-90 mb-2">Última Atualização</div>
        <div className="text-lg font-semibold">
          {new Date(stats.last_updated).toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
};

const CachedDocumentCard: React.FC<{
  doc: CachedDocument;
  onView: (hash: string) => void;
  onDelete: (hash: string) => void;
}> = ({ doc, onView, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">{doc.title}</h4>
          <p className="text-sm text-gray-600 mb-2">
            {doc.authors.length > 0 ? doc.authors.join(', ') : 'Autores não identificados'}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Hash: {doc.doc_hash.substring(0, 12)}...</span>
            <span>•</span>
            <span>{new Date(doc.cached_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        
        {doc.has_embeddings && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            Indexado
          </span>
        )}
      </div>
      
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={() => onView(doc.doc_hash)}
          className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2"
        >
          <FileTextIcon size={18} />
          Ver Detalhes
        </button>
        
        <button
          onClick={() => onDelete(doc.doc_hash)}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition"
        >
          Remover
        </button>
      </div>
    </div>
  );
};

const DocumentDetailsModal: React.FC<{
  docHash: string;
  apiUrl: string;
  onClose: () => void;
}> = ({ docHash, apiUrl, onClose }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(`${apiUrl}/cache/documents/${docHash}`);
        if (response.ok) {
          const data = await response.json();
          setDetails(data);
          console.log('Resposta bruta:', data);
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [docHash, apiUrl]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">Erro ao carregar documento</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const metadata = details.metadata || {};
  const entities = metadata.entities || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{entities.title || 'Sem título'}</h2>
              <p className="text-indigo-100 mt-2">
                Hash: {docHash.substring(0, 20)}...
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:text-indigo-200 text-3xl">
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Autores</label>
                <p className="text-gray-900">
                  {entities.authors?.length > 0 ? entities.authors.join(', ') : 'Não identificado'}
                </p>
              </div>
              
              {entities.supervisor && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Orientador</label>
                  <p className="text-gray-900">{entities.supervisor}</p>
                </div>
              )}
              
              {entities.institutions?.length > 0 && (
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Instituição</label>
                  <p className="text-gray-900">{entities.institutions.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Resumo */}
            {entities.abstract && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Resumo</label>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {entities.abstract}
                </p>
              </div>
            )}

            {/* Palavras-chave */}
            {entities.keywords?.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Palavras-chave</label>
                <div className="flex flex-wrap gap-2">
                  {entities.keywords.map((kw: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Informações técnicas */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Informações Técnicas</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Data de Cache:</span>
                  <span className="ml-2 text-gray-900 font-medium">
                    {new Date(details.cached_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Embeddings:</span>
                  <span className="ml-2 text-gray-900 font-medium">
                    {details.has_embeddings ? '✓ Sim' : '✗ Não'}
                  </span>
                </div>
                {metadata.file_size && (
                  <div>
                    <span className="text-gray-600">Tamanho:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {(metadata.file_size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}
                {metadata.text_quality !== undefined && (
                  <div>
                    <span className="text-gray-600">Qualidade:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {metadata.text_quality ? '✓ Boa' : '⚠ Baixa'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex gap-3">
          <a
            href={`${apiUrl}/cache/documents/${docHash}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <DownloadIcon size={20} />
            Baixar PDF
          </a>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

const CacheTab: React.FC<CacheTabProps> = ({ apiUrl, indexedWorks = [] }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [documents, setDocuments] = useState<CachedDocument[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<CachedDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cache' | 'indexed'>('cache');

  // Carrega dados iniciais
  useEffect(() => {
    loadCacheData();
  }, []);

  // Filtro de busca
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDocs(documents);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredDocs(
        documents.filter(
          (doc) =>
            doc.title.toLowerCase().includes(term) ||
            doc.authors.some((a) => a.toLowerCase().includes(term)) ||
            doc.doc_hash.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, documents]);

  const loadCacheData = async () => {
    setLoading(true);
    try {
      // Carrega estatísticas
      const statsRes = await fetch(`${apiUrl}/cache/stats`);
    if (statsRes.ok) {
      const contentType = statsRes.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        const text = await statsRes.text();
        console.error('Stats não é JSON:', text.slice(0, 200));
      }
    } else {
      console.error('Erro ao buscar stats:', statsRes.status);
    }


      // Carrega documentos
      const docsRes = await fetch(`${apiUrl}/cache/documents`);
    if (docsRes.ok) {
      const contentType = docsRes.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
        console.log('Documentos carregados:', docsData);
      } else {
        const text = await docsRes.text();
        console.error('Documents não é JSON:', text.slice(0, 200));
      }
    } else {
      console.error('Erro ao buscar documentos:', docsRes.status);
    }
  } catch (error) {
    console.error('Erro ao carregar cache:', error);
  } finally {
    setLoading(false);
  }
};

  const handleDeleteDocument = async (docHash: string) => {
    if (!confirm('Tem certeza que deseja remover este documento do cache?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/cache/documents/${docHash}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Documento removido com sucesso!');
        loadCacheData();
      } else {
        alert('Erro ao remover documento');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao remover documento');
    }
  };

  const handleClearCache = async () => {
    if (!confirm('⚠️ ATENÇÃO!\n\nIsso irá remover TODOS os documentos do cache.\n\nTem certeza?')) {
      return;
    }

    if (!confirm('Última confirmação: Esta ação é irreversível!')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/cache/clear`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadCacheData();
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao limpar cache');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cache...</p>
        </div>
      </div>
    );
  }

  // Filter indexed works by search term
  const filteredIndexedWorks = indexedWorks.filter(work => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      work.titulo.toLowerCase().includes(term) ||
      work.autor.toLowerCase().includes(term) ||
      work.palavrasChave.some(kw => kw.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8">
      {/* Estatísticas */}
      <CacheStatsCard stats={stats} />

      {/* Tabs para Cache e Indexed */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('cache')}
            className={`py-4 px-2 border-b-2 font-medium transition ${
              activeTab === 'cache'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            💾 Cache do Servidor ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('indexed')}
            className={`py-4 px-2 border-b-2 font-medium transition ${
              activeTab === 'indexed'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📚 Indexados Localmente ({indexedWorks.length})
          </button>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-4 items-center">
        <button
          onClick={loadCacheData}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          🔄 Recarregar
        </button>
        
        {activeTab === 'cache' && (
          <button
            onClick={handleClearCache}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
          >
            🗑️ Limpar Cache
          </button>
        )}

        <div className="flex-1"></div>

        {/* Busca */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Buscar por título, autor ou hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-96 px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </div>

      {/* Cache Tab */}
      {activeTab === 'cache' && (
        <>
          {filteredDocs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-md">
              <FileTextIcon className="inline opacity-30 mb-4" size={64} />
              <p className="text-lg text-gray-600">
                {searchTerm ? 'Nenhum documento encontrado' : 'Cache vazio'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDocs.map((doc) => (
                <CachedDocumentCard
                  key={doc.doc_hash}
                  doc={doc}
                  onView={setSelectedDoc}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Indexed Tab */}
      {activeTab === 'indexed' && (
        <>
          {filteredIndexedWorks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-md">
              <FileTextIcon className="inline opacity-30 mb-4" size={64} />
              <p className="text-lg text-gray-600">
                {searchTerm ? 'Nenhum documento encontrado' : 'Nenhum trabalho indexado localmente'}
              </p>
              <p className="text-sm text-gray-500 mt-2">Submeta um trabalho na aba de Upload para vê-lo aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredIndexedWorks.map((work) => (
                <div key={work.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-semibold text-indigo-600 flex-1">{work.titulo}</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Indexado
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{work.autor} ({work.ano})</p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-600">
                    <div><span className="font-semibold">Universidade:</span> {work.universidade}</div>
                    <div><span className="font-semibold">Supervisor:</span> {work.supervisor}</div>
                  </div>
                  
                  <div className="mb-3">
                    <span className="font-semibold text-gray-900 text-sm">Palavras-chave:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {work.palavrasChave.slice(0, 3).map((kw, idx) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                          {kw}
                        </span>
                      ))}
                      {work.palavrasChave.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{work.palavrasChave.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{work.resumo}</p>
                  
                  <button className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-100 transition">
                    Ver Detalhes
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de detalhes */}
      {selectedDoc && (
        <DocumentDetailsModal
          docHash={selectedDoc}
          apiUrl={apiUrl}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};

export default CacheTab;

// ==================== INTEGRAÇÃO NO APP.TSX ====================
// 
// Adicione estas modificações ao App.tsx existente:
//
// 1. Importe o componente:
//    import CacheTab from './components/CacheTab';
//
// 2. Atualize o tipo Tab:
//    export type Tab = 'upload' | 'search' | 'cache';
//
// 3. Adicione o botão na barra de tabs (componente Tabs):
//    <button
//      onClick={() => setActiveTab('cache')}
//      className={`py-4 px-2 border-b-2 font-medium transition flex items-center gap-2 ${
//        activeTab === 'cache'
//          ? 'border-indigo-600 text-indigo-600'
//          : 'border-transparent text-gray-600 hover:text-gray-900'
//      }`}
//    >
//      <FileTextIcon size={20} />
//      Gerenciar Cache
//    </button>
//
// 4. Adicione a renderização condicional no main:
//    {activeTab === 'cache' && (
//      <CacheTab apiUrl="https://YOUR_NGROK_URL" />
//    )}
//
// ==================== ZERO MUDANÇAS NAS TABS EXISTENTES ====================