import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

// Set the worker source - use the imported URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

interface PDFViewerProps {
  file: File | string;
  height?: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file, height = '600px', onLoadSuccess, onLoadError }) => {
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        let pdfData;
        if (typeof file === 'string') {
          // URL-based PDF
          const response = await fetch(file);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          }
          pdfData = await response.arrayBuffer();
        } else {
          // File-based PDF
          pdfData = await file.arrayBuffer();
        }

        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        setPdf(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        onLoadSuccess?.(pdf.numPages);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        onLoadError?.(error);
        console.error('Error loading PDF:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [file, onLoadSuccess, onLoadError]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvas) return;

      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: canvas.getContext('2d'),
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    if (pdf && canvas) {
      renderPage();
    }
  }, [pdf, currentPage, canvas]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, numPages));
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Erro ao carregar PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-600">
          <p>PDF não carregado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* PDF Canvas */}
      <div className="border border-gray-300 rounded-lg bg-gray-100 overflow-auto" style={{ height }}>
        <canvas
          ref={setCanvas}
          className="w-full"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <ChevronLeftIcon size={18} />
          Anterior
        </button>

        <div className="text-center">
          <p className="text-gray-900 font-semibold">
            Página <input
              type="number"
              min="1"
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= numPages) {
                  setCurrentPage(page);
                }
              }}
              className="w-12 px-2 py-1 border border-gray-300 rounded text-center"
            /> de {numPages}
          </p>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= numPages}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          Próxima
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </div>
  );
};

export default PDFViewer;
