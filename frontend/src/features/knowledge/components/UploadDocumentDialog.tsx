// frontend/src/features/knowledge/components/UploadDocumentDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  BookOpen,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useUploadDocument } from '../hooks';
import { DocType, Audience, KnowledgeDocument } from '../types';
import { DOC_TYPE_LABELS, AUDIENCE_LABELS } from '../utils';

export interface UploadDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDocumentId: number) => void;
  existingDocuments?: KnowledgeDocument[];
  prefilledTitle?: string;
  prefilledType?: DocType;
}

export const UploadDocumentDialog: React.FC<UploadDocumentDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingDocuments = [],
  prefilledTitle = '',
  prefilledType = 'politica_interna'
}) => {
  const { upload, cancel, isUploading, progress, error, clearError } = useUploadDocument();

  // Estados do formulário
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(prefilledTitle);
  const [docType, setDocType] = useState<DocType>(prefilledType);
  const [version, setVersion] = useState('');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
  const [validityText, setValidityText] = useState('');
  const [audience, setAudience] = useState<Audience>('todos');
  const [sourceOrg, setSourceOrg] = useState('');

  // Feedback de sucesso
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (prefilledTitle) {
      setTitle(prefilledTitle);
    }
  }, [prefilledTitle]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setTitle('');
      setVersion('');
      setValidityText('');
      setSourceOrg('');
      setValidationError(null);
      setSuccessResult(null);
      clearError();
    }
  }, [isOpen, clearError]);

  if (!isOpen) return null;

  // Verifica se já existe documento vigente com o mesmo título
  const existingSameTitle = existingDocuments.find(
    (d) => d.isCurrent && !d.isArchived && d.title.trim().toLowerCase() === title.trim().toLowerCase()
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('Apenas arquivos no formato PDF são permitidos.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setValidationError('O tamanho máximo do documento é de 20 MB.');
      return;
    }

    setValidationError(null);
    clearError();
    setFile(selectedFile);

    // Sugere título automaticamente se estiver vazio
    if (!title.trim()) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isUploading) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (droppedFile.type !== 'application/pdf' && !droppedFile.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('Apenas arquivos no formato PDF são permitidos.');
      return;
    }

    if (droppedFile.size > 20 * 1024 * 1024) {
      setValidationError('O tamanho máximo do documento é de 20 MB.');
      return;
    }

    setValidationError(null);
    clearError();
    setFile(droppedFile);

    if (!title.trim()) {
      const cleanName = droppedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!file) {
      setValidationError('Selecione um arquivo PDF de até 20 MB.');
      return;
    }
    if (!title.trim()) {
      setValidationError('O título do documento é obrigatório.');
      return;
    }
    if (!version.trim()) {
      setValidationError('A versão do documento é obrigatória.');
      return;
    }

    try {
      const res = await upload({
        file,
        title: title.trim(),
        docType,
        version: version.trim(),
        publishDate: publishDate || undefined,
        effectiveTo: validityText.trim() || undefined,
        audience,
        sourceOrg: sourceOrg.trim() || undefined
      });

      setSuccessResult(res.document);

      setTimeout(() => {
        onSuccess(res.document.id);
        onClose();
      }, 1500);
    } catch {
      // Erro é capturado pelo hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-labelledby="upload-dialog-title"
        aria-modal="true"
      >
        {/* Cabeçalho clássico em tom de cinza suave */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 id="upload-dialog-title" className="text-sm font-bold text-slate-900">
              Adicionar Documento à Base
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com scroll interno */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          {/* Aviso Fixo LGPD */}
          <div className="flex items-start gap-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-blue-900 text-[11px]">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>LGPD:</strong> Não inclua documentos com dados pessoais de colaboradores (como CPF, telefones ou e-mails pessoais).
            </span>
          </div>

          {/* Aviso de substituição de versão */}
          {existingSameTitle && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Já existe a versão <strong>{existingSameTitle.version}</strong> de "
                <strong>{existingSameTitle.title}</strong>". A nova versão substituirá a atual, que ficará como histórica.
              </span>
            </div>
          )}

          {/* Título do Documento */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Título do Documento *
            </label>
            <input
              type="text"
              required
              placeholder="Ex.: Política de Aprendizes em Eventos Externos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Tipo e Versão */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tipo *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                disabled={isUploading}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Versão *</label>
              <input
                type="text"
                required
                placeholder="Ex.: 2026.1 ou v1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={isUploading}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Público e Órgão */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Público-Alvo *</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                disabled={isUploading}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {Object.entries(AUDIENCE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Órgão / Origem</label>
              <input
                type="text"
                placeholder="Ex.: RH Corporativo, MTE"
                value={sourceOrg}
                onChange={(e) => setSourceOrg(e.target.value)}
                disabled={isUploading}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Período de Vigência e Data de Publicação */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Data de Publicação
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                disabled={isUploading}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Período de Vigência
              </label>
              <input
                type="text"
                placeholder="Ex.: Indeterminada ou 2027-12-31"
                value={validityText}
                onChange={(e) => setValidityText(e.target.value)}
                disabled={isUploading}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Arquivo PDF com área arrastável limpa */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Arquivo PDF (máx. 20 MB) *
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all bg-slate-50/60 ${
                isDragOver ? 'border-blue-500 bg-blue-50/40' : 'border-slate-300 hover:border-blue-400'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2 overflow-hidden text-left">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="space-y-1 py-2">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    Arraste o documento PDF aqui ou selecione abaixo
                  </p>
                  <label className="inline-block mt-1 cursor-pointer">
                    <span className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline">
                      Escolher arquivo
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      required
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400">PDF com texto ou escaneado até 20 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Progresso Durante Envio */}
          {isUploading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between text-[11px] font-medium text-blue-900">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  {progress < 100 ? `Enviando arquivo (${progress}%)...` : 'Indexando trechos com IA...'}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Feedback de Sucesso */}
          {successResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Documento indexado com sucesso!
              </div>
              <p className="text-[11px] text-emerald-700">
                {successResult.pageCount} página(s), {successResult.chunkCount} trechos gerados.
              </p>
            </div>
          )}

          {/* Mensagens de Erro */}
          {(validationError || error) && (
            <div className="p-2.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            {isUploading ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancel}
                className="text-xs text-rose-600"
              >
                Cancelar
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancelar
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUploading || !!successResult}
              className="gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Indexando...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Indexar Documento
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
