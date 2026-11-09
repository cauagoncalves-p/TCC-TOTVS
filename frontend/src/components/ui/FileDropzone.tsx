import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  disabled?: boolean;
  isUploading?: boolean;
  errorMessage?: string | null;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  accept = '.pdf,application/pdf',
  maxSizeMb = 5,
  disabled = false,
  isUploading = false,
  errorMessage = null,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxSizeMb * 1024 * 1024;

  const validateAndSelect = (file: File) => {
    setLocalError(null);

    // Validação de tipo PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLocalError('Formato inválido. Apenas arquivos PDF são aceitos.');
      return;
    }

    // Validação de tamanho
    if (file.size > maxBytes) {
      setLocalError(`O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(1)} MB) excede o limite máximo permitido de ${maxSizeMb} MB.`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelect(file);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSelect(file);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeError = errorMessage || localError;

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.005]'
            : 'border-slate-300 hover:border-primary/60 bg-slate-50/50 hover:bg-slate-50',
          (disabled || isUploading) && 'opacity-60 cursor-not-allowed pointer-events-none'
        )}
      >
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : selectedFile ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          ) : (
            <UploadCloud className="w-7 h-7" />
          )}
        </div>

        {selectedFile ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800 flex items-center justify-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              {selectedFile.name}
            </p>
            <p className="text-xs text-slate-500">
              {(selectedFile.size / 1024).toFixed(1)} KB — Pronto para processamento com IA
            </p>
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7"
              >
                Trocar arquivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-800">
              Arraste a ficha cadastral em PDF aqui ou clique para selecionar
            </p>
            <p className="text-xs text-slate-500">
              Aceita somente arquivos PDF de até {maxSizeMb} MB (com texto selecionável)
            </p>
          </div>
        )}
      </div>

      {activeError && (
        <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
};
