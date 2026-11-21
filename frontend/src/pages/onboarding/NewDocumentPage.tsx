// frontend/src/pages/onboarding/NewDocumentPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, PenTool, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { Button } from '../../components/ui/Button';
import { useUploadOnboarding } from '../../features/onboarding/hooks';

export const NewDocumentPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadMutation = useUploadOnboarding();

  const handleProcessUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadError(null);
      const result = await uploadMutation.mutateAsync({ file: selectedFile });
      navigate(`/onboarding/${result.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Falha ao processar o arquivo PDF.';
      setUploadError(msg);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/onboarding')}
          className="text-xs text-slate-600 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para lista</span>
        </Button>
      </div>

      <PageHeader
        title="Enviar Documento para Admissão (IA)"
        subtitle="O motor de IA lê a ficha admissional em PDF e pré-preenche automaticamente o formulário de revisão."
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <FileDropzone
          onFileSelect={(file) => {
            setSelectedFile(file);
            setUploadError(null);
          }}
          isUploading={uploadMutation.isPending}
          disabled={uploadMutation.isPending}
          errorMessage={uploadError}
          maxSizeMb={5}
        />

        {uploadError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Dificuldade na leitura automática?</span>
            </div>
            <p className="text-amber-800">
              Você pode optar pelo preenchimento manual direto, sem necessidade de enviar o documento por IA.
            </p>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/onboarding/novo/manual')}
                className="gap-1.5 text-xs text-amber-900 border-amber-300 hover:bg-amber-100"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Ir para preenchimento manual</span>
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/onboarding/novo/manual')}
            className="gap-1.5 text-xs"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Preencher manualmente em vez disso</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleProcessUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            isLoading={uploadMutation.isPending}
            className="gap-1.5 text-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>{uploadMutation.isPending ? 'Lendo o documento com IA...' : 'Processar Documento'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewDocumentPage;
