
import React, { useState, useEffect } from 'react';
import type { UploadState, ExtractedData } from '../types';
import { UploadIcon, ClockIcon, FileTextIcon, CheckCircleIcon } from './icons';

interface UploadTabProps {
  uploadState: UploadState;
  extractedData: ExtractedData | null;
  errorMessage: string | null;
  onFileUpload: (file: File) => void;
  onSubmitWork: (data: ExtractedData) => void;
  onCancel: () => void;
}

const IdleView: React.FC<{ onFileUpload: (file: File) => void }> = ({ onFileUpload }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-12 border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition">
      <label className="flex flex-col items-center justify-center cursor-pointer">
        <UploadIcon size={48} className="text-indigo-600 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Submeter Trabalho Acadêmico</h3>
        <p className="text-gray-600 text-center mb-2">Arraste seu documento aqui ou clique para selecionar</p>
        <p className="text-sm text-gray-500">Formatos aceitos: PDF</p>
        <input type="file" onChange={handleFileChange} accept=".pdf" className="hidden" />
      </label>
    </div>
  );
};

const ProcessingView: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-white rounded-lg shadow-md p-12 text-center">
    <ClockIcon className="inline animate-spin text-indigo-600 mb-4" size={48} />
    <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">{text}</h3>
    <p className="text-gray-600">O sistema está a realizar leitura e extração semântica de dados. Isso pode levar um momento.</p>
  </div>
);

const SuccessView: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-12 text-center space-y-4">
    <CheckCircleIcon className="inline text-green-600 animate-bounce" size={64} />
    <h3 className="text-2xl font-bold text-green-600">Sucesso!</h3>
    <p className="text-gray-600 text-lg mb-4">Seu trabalho foi submetido e está sendo indexado.</p>
    <p className="text-sm text-gray-500">Em breve estará disponível para busca semântica.</p>
  </div>
);

const VerificationForm: React.FC<{
  initialData: ExtractedData;
  onSubmit: (data: ExtractedData) => void;
  onCancel: () => void;
}> = ({ initialData, onSubmit, onCancel }) => {
  const [editedData, setEditedData] = useState(initialData);

  useEffect(() => {
    setEditedData(initialData);
  }, [initialData]);

  const handleFieldChange = (field: keyof ExtractedData, value: string | string[]) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(editedData);
  }

  const InputField: React.FC<{label: string, field: keyof ExtractedData, type?: string, placeholder?: string}> = ({label, field, type="text", placeholder}) => (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
        <input
            type={type}
            value={(editedData[field] as string) || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
  );
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <FileTextIcon className="text-blue-600" size={24} />
        <div>
          <h3 className="font-semibold text-blue-900">Ficha de Verificação</h3>
          <p className="text-sm text-blue-800">Verifique e corrija os dados extraídos pelo modelo de IA.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Autor" field="autor" />
        <InputField label="Universidade" field="universidade" />
        <div className="md:col-span-2">
           <InputField label="Título" field="titulo" />
        </div>
        <InputField label="Faculdade" field="faculdade" />
        <InputField label="Departamento" field="departamento" />
        <InputField label="Supervisor" field="supervisor" />
        <InputField label="Co-supervisor" field="coSupervisor" />
        <InputField label="Ano" field="ano" type="number" />
        <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Palavras-chave</label>
            <input
                type="text"
                value={Array.isArray(editedData.palavrasChave) ? editedData.palavrasChave.join(', ') : ''}
                onChange={(e) => handleFieldChange('palavrasChave', e.target.value.split(',').map(kw => kw.trim()))}
                placeholder="Separe com vírgulas"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Resumo</label>
            <textarea
                value={editedData.resumo}
                onChange={(e) => handleFieldChange('resumo', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">
          Cancelar
        </button>
        <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
          Submeter Trabalho
        </button>
      </div>
    </form>
  );
};


const UploadTab: React.FC<UploadTabProps> = ({
  uploadState,
  extractedData,
  errorMessage,
  onFileUpload,
  onSubmitWork,
  onCancel,
}) => {
  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      {uploadState === 'idle' && <IdleView onFileUpload={onFileUpload} />}
      {uploadState === 'processing' && <ProcessingView text="A processar documento..." />}
      {uploadState === 'verifying' && extractedData && (
        <VerificationForm initialData={extractedData} onSubmit={onSubmitWork} onCancel={onCancel} />
      )}
      {uploadState === 'submitting' && <ProcessingView text="A submeter trabalho..." />}
      {uploadState === 'success' && <SuccessView />}
    </div>
  );
};

export default UploadTab;
