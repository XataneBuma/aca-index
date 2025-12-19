# -*- coding: utf-8 -*-
"""
Backend API Integrada para Pipeline Acadêmica
Adicione este código APÓS a classe AcademicProcessingPipeline no untitled8.py
"""

import logging
import tempfile
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

# FastAPI e dependências
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import nest_asyncio
import uvicorn
from pyngrok import ngrok

logger = logging.getLogger(__name__)

# ==================== MODELOS PYDANTIC ====================

class DocumentInfo(BaseModel):
    """Informações de documento processado"""
    id: int
    file_path: str
    title: str
    authors: List[str] = []
    abstract: str = ""
    keywords: List[str] = []
    institutions: List[str] = []
    topics: List[str] = []
    text_quality: bool

class SearchQuery(BaseModel):
    """Query de busca"""
    query: str = Field(..., min_length=1, max_length=500)
    k: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.6, ge=0.0, le=1.0)

class SearchResult(BaseModel):
    """Resultado de busca"""
    document_id: int
    title: str
    authors: List[str]
    abstract: str
    similarity_score: float

class HealthCheck(BaseModel):
    """Health check"""
    status: str
    pipeline_loaded: bool
    documents_indexed: int
    timestamp: str

# ==================== BACKEND API ====================

class AcademicBackendAPI:
    def __init__(self, pipeline: 'AcademicProcessingPipeline'):
        """
        Inicializa API com pipeline existente
        
        Args:
            pipeline: Instância de AcademicProcessingPipeline já inicializada
        """
        self.pipeline = pipeline
        self.app = FastAPI(
            title="Academic Pipeline API",
            description="API para processamento e busca de documentos acadêmicos",
            version="1.0.0"
        )
        
        # Configuração CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Estado
        self.processing_status = {
            'total': 0,
            'processed': 0,
            'failed': 0,
            'in_progress': False,
            'last_update': datetime.now().isoformat()
        }
        self.temp_dir = tempfile.mkdtemp()
        
        # Registra rotas
        self._register_routes()
    
    def _register_routes(self):
        """Registra todas as rotas da API"""
        
        # ==================== HEALTH CHECK ====================
        
        @self.app.get("/", response_model=HealthCheck)
        async def root():
            """Health check principal"""
            return HealthCheck(
                status="online",
                pipeline_loaded=self.pipeline is not None,
                documents_indexed=len(self.pipeline.documents) if self.pipeline else 0,
                timestamp=datetime.now().isoformat()
            )
        
        @self.app.get("/health")
        async def health_check():
            """Verifica saúde do sistema"""
            return await root()
        
        # ==================== UPLOAD ====================
        
        @self.app.post("/upload/single")
        async def upload_single_pdf(
            file: UploadFile = File(...),
            background_tasks: BackgroundTasks = BackgroundTasks()
        ):
            """Upload e processamento de um único PDF"""
            if not file.filename.lower().endswith('.pdf'):
                raise HTTPException(
                    status_code=400, 
                    detail="Apenas arquivos PDF são aceitos"
                )
            
            try:
                # Salva arquivo temporariamente
                temp_path = Path(self.temp_dir) / file.filename
                with open(temp_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                
                # Processa documento
                logger.info(f"Processando: {file.filename}")
                result = self.pipeline._process_single_document(str(temp_path))
                
                # Adiciona à lista
                self.pipeline.documents.append(result)
                
                # Atualiza índice em background
                background_tasks.add_task(self._update_search_index)
                
                return JSONResponse({
                    "status": "success",
                    "message": f"Documento processado: {file.filename}",
                    "document": self._format_document(result)
                })
                
            except Exception as e:
                logger.error(f"Erro ao processar {file.filename}: {str(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Erro ao processar: {str(e)}"
                )
        
        @self.app.post("/upload/batch")
        async def upload_batch_pdfs(
            files: List[UploadFile] = File(...),
            background_tasks: BackgroundTasks = BackgroundTasks()
        ):
            """Upload e processamento em lote"""
            pdf_files = [f for f in files if f.filename.lower().endswith('.pdf')]
            
            if not pdf_files:
                raise HTTPException(
                    status_code=400, 
                    detail="Nenhum arquivo PDF válido"
                )
            
            try:
                # Salva arquivos
                temp_paths = []
                for file in pdf_files:
                    temp_path = Path(self.temp_dir) / file.filename
                    with open(temp_path, "wb") as f:
                        content = await file.read()
                        f.write(content)
                    temp_paths.append(str(temp_path))
                
                # Processa em background
                self.processing_status['in_progress'] = True
                self.processing_status['total'] = len(temp_paths)
                
                background_tasks.add_task(
                    self._process_batch_background,
                    temp_paths
                )
                
                return JSONResponse({
                    "status": "accepted",
                    "message": f"{len(pdf_files)} documentos em processamento",
                    "check_status_at": "/processing/status"
                })
                
            except Exception as e:
                logger.error(f"Erro no upload: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # ==================== BUSCA ====================
        
        @self.app.post("/search", response_model=List[SearchResult])
        async def search_documents(query: SearchQuery):
            """Busca semântica"""
            if not self.pipeline.indexer.index:
                raise HTTPException(
                    status_code=404, 
                    detail="Índice não disponível"
                )
            
            try:
                results = self.pipeline.search_documents(
                    query.query,
                    k=query.k
                )
                
                formatted = []
                for result in results:
                    if result.get('similarity_score', 0) >= query.min_score:
                        formatted.append(SearchResult(
                            document_id=result['id'],
                            title=result['entities'].get('title', 'Sem título'),
                            authors=result['entities'].get('authors', []),
                            abstract=result['entities'].get('abstract', '')[:300],
                            similarity_score=result['similarity_score']
                        ))
                
                return formatted
                
            except Exception as e:
                logger.error(f"Erro na busca: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # ==================== DOCUMENTOS ====================
        
        @self.app.get("/documents")
        async def list_documents(
            skip: int = Query(0, ge=0),
            limit: int = Query(20, ge=1, le=100)
        ):
            """Lista documentos processados"""
            docs = self.pipeline.documents
            total = len(docs)
            paginated = docs[skip:skip + limit]
            
            return {
                "total": total,
                "skip": skip,
                "limit": limit,
                "documents": [self._format_document(doc) for doc in paginated]
            }
        
        @self.app.get("/documents/{document_id}")
        async def get_document(document_id: int):
            """Retorna documento específico"""
            for doc in self.pipeline.documents:
                if doc['id'] == document_id:
                    return self._format_document(doc, full=True)
            
            raise HTTPException(status_code=404, detail="Documento não encontrado")
        
        # ==================== ESTATÍSTICAS ====================
        
        @self.app.get("/stats/overview")
        async def get_stats():
            """Estatísticas gerais"""
            docs = self.pipeline.documents
            
            return {
                "total_documents": len(docs),
                "with_abstract": sum(1 for d in docs if d['entities'].get('abstract')),
                "good_quality": sum(1 for d in docs if d.get('text_quality')),
                "last_update": datetime.now().isoformat()
            }
        
        @self.app.get("/processing/status")
        async def get_processing_status():
            """Status do processamento"""
            return self.processing_status
    
    # ==================== MÉTODOS AUXILIARES ====================
    
    def _format_document(self, doc: Dict[str, Any], full: bool = False) -> Dict:
        """Formata documento para resposta"""
        entities = doc.get('entities', {})
        
        result = {
            "id": doc['id'],
            "file_path": doc['file_path'],
            "title": entities.get('title', 'Sem título'),
            "authors": entities.get('authors', []),
            "abstract": entities.get('abstract', '')[:300] if not full else entities.get('abstract', ''),
            "keywords": entities.get('keywords', []),
            "topics": entities.get('topics', []),
            "text_quality": doc.get('text_quality', False)
        }
        
        return result
    
    async def _process_batch_background(self, file_paths: List[str]):
        """Processa lote em background"""
        try:
            results = self.pipeline.process_documents(file_paths, batch_size=5)
            
            self.processing_status['processed'] = len([r for r in results if r.get('text_quality')])
            self.processing_status['failed'] = len([r for r in results if not r.get('text_quality')])
            self.processing_status['in_progress'] = False
            self.processing_status['last_update'] = datetime.now().isoformat()
            
            logger.info(f"Lote concluído: {self.processing_status['processed']}/{self.processing_status['total']}")
            
        except Exception as e:
            logger.error(f"Erro no processamento: {str(e)}")
            self.processing_status['in_progress'] = False
    
    def _update_search_index(self):
        """Atualiza índice de busca"""
        try:
            if self.pipeline.documents:
                logger.info("Atualizando índice...")
                self.pipeline._build_search_index(self.pipeline.documents)
                logger.info("Índice atualizado")
        except Exception as e:
            logger.error(f"Erro ao atualizar índice: {str(e)}")
    
    def run(self, port: int = 8000, ngrok_token: Optional[str] = None):
        """Inicia servidor com ngrok"""
        try:
            nest_asyncio.apply()
            
            if ngrok_token:
                ngrok.set_auth_token(ngrok_token)
                ngrok.kill()  # Fecha túneis anteriores
                public_url = ngrok.connect(port)
                
                print("\n" + "="*70)
                print("🚀 API ACADÊMICA INICIADA COM SUCESSO!")
                print("="*70)
                print(f"🌐 URL Pública: {public_url}")
                print(f"📚 Documentação: {public_url}/docs")
                print(f"📊 Health Check: {public_url}/health")
                print("="*70 + "\n")
            
            config = uvicorn.Config(
                self.app,
                host="0.0.0.0",
                port=port,
                log_level="info"
            )
            
            server = uvicorn.Server(config)
            return server.serve()
            
        except Exception as e:
            logger.error(f"Erro ao iniciar servidor: {str(e)}")
            raise

# ==================== FUNÇÃO DE INICIALIZAÇÃO ====================

def start_api_server(pipeline: 'AcademicProcessingPipeline', 
                     ngrok_token: str, 
                     port: int = 8000):
    """
    Inicia servidor API com pipeline existente
    
    Uso:
        pipeline = AcademicProcessingPipeline(drive_mount=True)
        await start_api_server(pipeline, "SEU_TOKEN_NGROK")
    """
    api = AcademicBackendAPI(pipeline)
    return api.run(port=port, ngrok_token=ngrok_token)

# ==================== EXEMPLO DE USO ====================

"""
# Cole este código no final do untitled8.py, substituindo o código existente

# Após criar a pipeline:
pipeline = AcademicProcessingPipeline(drive_mount=True)

# Inicie a API:
NGROK_TOKEN = "36sdBzYjUCLEQpZJAsov3ikwBsf_2KSgYDHX67RmjaVYjEE5X"
await start_api_server(pipeline, NGROK_TOKEN, port=8000)
"""