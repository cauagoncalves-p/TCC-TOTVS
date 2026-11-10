import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Filter,
  X
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/formatters';
import { KnowledgeDocument } from '../../types/api';

const INITIAL_DOCS: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: 'Consolidação das Leis do Trabalho (CLT) - Atualizada',
    type: 'clt',
    version: '2026.1',
    publishDate: '2026-01-10',
    validity: 'Indeterminada',
    isCurrent: true,
    fileSize: '4.8 MB'
  },
  {
    id: 'doc-2',
    title: 'Manual de Orientação do eSocial (MOS) - Versão S-1.2',
    type: 'manual_esocial',
    version: 'S-1.2 (Rev. Nov/26)',
    publishDate: '2026-10-01',
    validity: 'Vigente para eventos 2026',
    isCurrent: true,
    fileSize: '12.4 MB'
  },
  {
    id: 'doc-3',
    title: 'Manual de Orientação do eSocial (MOS) - Versão S-1.1',
    type: 'manual_esocial',
    version: 'S-1.1',
    publishDate: '2025-06-15',
    validity: 'Substituído pela S-1.2',
    isCurrent: false,
    fileSize: '11.8 MB'
  },
  {
    id: 'doc-4',
    title: 'Convenção Coletiva de Trabalho (CCT) 2026/2027 - TI & Serviços',
    type: 'acordo_coletivo',
    version: '2026/2027',
    publishDate: '2026-05-01',
    validity: '30/04/2027',
    isCurrent: true,
    fileSize: '1.9 MB'
  },
  {
    id: 'doc-5',
    title: 'Política Interna de Férias e Descanso Semanal Remunerado',
    type: 'politica_interna',
    version: 'v3.0',
    publishDate: '2026-03-12',
    validity: 'Indeterminada',
    isCurrent: true,
    fileSize: '850 KB'
  },
  {
    id: 'doc-6',
    title: 'Política Interna de Férias - Versão 2.1',
    type: 'politica_interna',
    version: 'v2.1',
    publishDate: '2024-02-10',
    validity: 'Substituída pela v3.0',
    isCurrent: false,
    fileSize: '780 KB'
  }
];

export const KnowledgePage: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(INITIAL_DOCS);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<KnowledgeDocument['type']>('politica_interna');
  const [formVersion, setFormVersion] = useState('');
  const [formValidity, setFormValidity] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  const filtered = documents.filter((doc) => {
    if (typeFilter && doc.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchVersion = doc.version.toLowerCase().includes(q);
      if (!matchTitle && !matchVersion) return false;
    }
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setFormError('Apenas arquivos no formato PDF são permitidos.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setFormError('O tamanho máximo do documento é de 20 MB.');
      return;
    }

    setFormError('');
    setFormFile(file);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('O título do documento é obrigatório.');
      return;
    }
    if (!formVersion.trim()) {
      setFormError('A versão do documento é obrigatória.');
      return;
    }
    if (!formFile) {
      setFormError('Selecione um arquivo PDF de até 20 MB.');
      return;
    }

    // Se a nova versão for cadastrada como atual, marca versões anteriores do mesmo tipo como não-atuais
    const updatedPrev = documents.map((doc) => {
      if (doc.type === formType && doc.title.toLowerCase().includes(formTitle.toLowerCase().slice(0, 10))) {
        return { ...doc, isCurrent: false, validity: 'Substituído pela versão ' + formVersion };
      }
      return doc;
    });

    const newDoc: KnowledgeDocument = {
      id: `doc-${Date.now()}`,
      title: formTitle.trim(),
      type: formType,
      version: formVersion.trim(),
      publishDate: new Date().toISOString().slice(0, 10),
      validity: formValidity.trim() || 'Indeterminada',
      isCurrent: true,
      fileSize: `${(formFile.size / (1024 * 1024)).toFixed(1)} MB`
    };

    setDocuments([newDoc, ...updatedPrev]);
    setIsModalOpen(false);

    // Reset
    setFormTitle('');
    setFormVersion('');
    setFormValidity('');
    setFormFile(null);
    setFormError('');
  };

  const getTypeLabel = (type: KnowledgeDocument['type']) => {
    switch (type) {
      case 'clt':
        return 'Legislação / CLT';
      case 'manual_esocial':
        return 'Manual eSocial (MOS)';
      case 'acordo_coletivo':
        return 'Acordo / Convenção';
      case 'politica_interna':
        return 'Política Interna';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Base de Conhecimento Trabalhista"
        subtitle="Repositório oficial de manuais normativos, acordos coletivos e diretrizes corporativas indexadas pelo Assistente RAG."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Adicionar Documento Oficial
          </Button>
        }
      />

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white"
          >
            <option value="">Todos os tipos</option>
            <option value="clt">Legislação / CLT</option>
            <option value="manual_esocial">Manual eSocial (MOS)</option>
            <option value="acordo_coletivo">Acordo / Convenção Coletiva</option>
            <option value="politica_interna">Políticas Internas</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por palavras-chave ou versão..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Lista de Documentos */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum documento encontrado"
          description="Nenhum manual ou documento normativo corresponde aos filtros."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {getTypeLabel(doc.type)}
                  </span>
                  {doc.isCurrent ? (
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                      Vigente
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[10px]">
                      <Clock className="w-2.5 h-2.5 mr-0.5" />
                      Histórica
                    </Badge>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {doc.title}
                  </h4>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Versão:</span>
                  <span className="font-semibold text-slate-700">{doc.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Publicação:</span>
                  <span>{formatDate(doc.publishDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vigência:</span>
                  <span className="text-slate-700">{doc.validity}</span>
                </div>
                {doc.fileSize && (
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Tamanho:</span>
                    <span>{doc.fileSize}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Upload com Metadados */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Adicionar Documento à Base
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Acordo Coletivo 2026/2027"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="clt">Legislação / CLT</option>
                    <option value="manual_esocial">Manual eSocial (MOS)</option>
                    <option value="acordo_coletivo">Acordo / Convenção</option>
                    <option value="politica_interna">Política Interna</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Versão *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: v3.1 ou 2026.2"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Período de Vigência
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Até 31/12/2027 ou Indeterminada"
                  value={formValidity}
                  onChange={(e) => setFormValidity(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Arquivo PDF (máx. 20 MB) *
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {formError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Indexar Documento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
