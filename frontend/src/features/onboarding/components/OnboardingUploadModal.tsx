import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { Button } from '../../../components/ui/Button';
import { useUploadOnboarding } from '../hooks';
import { useNavigate } from 'react-router-dom';

export interface OnboardingUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdCaseId: number) => void;
}

export const OnboardingUploadModal: React.FC<OnboardingUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadMutation = useUploadOnboarding();

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleProcessUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadError(null);
      const result = await uploadMutation.mutateAsync(selectedFile);
      if (onSuccess) {
        onSuccess(result.id);
      } else {
        navigate(`/onboarding/${result.id}`);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Falha ao processar o arquivo PDF.';
      setUploadError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Novo Envio de Admissão</h3>
              <p className="text-xs text-slate-500">Extração estruturada de dados cadastrais com IA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadMutation.isPending}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <FileDropzone
            onFileSelect={handleFileSelect}
            isUploading={uploadMutation.isPending}
            disabled={uploadMutation.isPending}
            errorMessage={uploadError}
            maxSizeMb={5}
          />

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
            <span className="font-semibold text-slate-700">Dica:</span> O documento deve conter texto selecionável. Os campos (Nome, CPF, Data de Nascimento, Contatos, Cargo e Salário) serão pré-preenchidos e validados automaticamente.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={uploadMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleProcessUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            isLoading={uploadMutation.isPending}
            className="gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {uploadMutation.isPending ? 'Extraindo dados com IA...' : 'Processar Admissão'}
          </Button>
        </div>
      </div>
    </div>
  );
};
