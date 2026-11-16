// frontend/src/pages/knowledge/PolicyEditorPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Sparkles,
  FileText,
  AlertTriangle,
  Info,
  Loader2,
  Check,
  Eye,
  Edit3
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StructureSuggestionDialog } from '../../features/knowledge/components/StructureSuggestionDialog';
import { knowledgeApi } from '../../features/knowledge/api';
import { Audience, CreatePolicyPayload } from '../../features/knowledge/types';
import { detectPiiWarnings, AUDIENCE_LABELS } from '../../features/knowledge/utils';

const DEFAULT_POLICY_TEMPLATE = `# Política Interna de [Nome da Política]

## 1. Resumo Rápido
Esta política estabelece as diretrizes e procedimentos corporativos aplicáveis a todos os colaboradores da empresa a respeito de [Tema da Política].

## 2. Objetivo e Abrangência
O objetivo desta norma é garantir a transparência, conformidade legal e padronização dos processos internos relacionados a [Tema].
Aplica-se a todos os colaboradores em regime CLT, estagiários e aprendizes.

## 3. Definições
- **Colaborador:** Todo profissional com vínculo empregatício direto.
- **Gestor Imediato:** Responsável direto pela aprovação dos registros.

## 4. Regras e Procedimentos
### 4.1. Como funciona na prática?
Os pedidos e comunicações devem ser realizados com antecedência mínima de 5 dias úteis através do canal corporativo.

### 4.2. Prazos e Documentação
Toda comprovação necessária deve ser anexada até o encerramento do fechamento de ponto do mês vigente.

## 5. Exceções
Casos omissos ou situações emergenciais deverão ser submetidos à análise direta do departamento de Recursos Humanos corporativo.

---
*Nota: Este documento constitui política e regulamento interno corporativo e integra as normas operacionais da organização.*
`;

export const PolicyEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  // Form states
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<'politica_interna' | 'acordo_convencao'>('politica_interna');
  const [version, setVersion] = useState('1.0');
  const [audience, setAudience] = useState<Audience>('colaboradores');
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [bodyText, setBodyText] = useState('');

  // UI states
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Structure Dialog states
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestedText, setSuggestedText] = useState('');

  // PII warnings
  const piiWarnings = detectPiiWarnings(bodyText);

  // Carrega documento se for edição/nova versão
  useEffect(() => {
    if (id) {
      setIsLoadingDocument(true);
      knowledgeApi
        .getDocument(id)
        .then((doc) => {
          setTitle(doc.title);
          if (doc.docType === 'politica_interna' || doc.docType === 'acordo_convencao') {
            setDocType(doc.docType);
          }
          // Incrementa versão sugerida
          const currentVer = parseFloat(doc.version) || 1.0;
          setVersion((currentVer + 0.1).toFixed(1));
          setAudience(doc.audience);
          setBodyText(doc.bodyText || '');
          if (doc.publishedAt) setPublishDate(doc.publishedAt.split('T')[0]);
        })
        .catch((err) => {
          setErrorMessage('Erro ao carregar dados da política existente para nova versão.');
        })
        .finally(() => {
          setIsLoadingDocument(false);
        });
    }
  }, [id]);

  const handleInsertTemplate = () => {
    if (bodyText && !window.confirm('Substituir o conteúdo atual pelo modelo padrão?')) {
      return;
    }
    setBodyText(DEFAULT_POLICY_TEMPLATE);
  };

  const handleStructurePreview = async () => {
    if (!bodyText.trim() || isSuggesting) return;
    setIsSuggesting(true);
    setErrorMessage(null);
    try {
      const res = await knowledgeApi.structurePreview(bodyText);
      setSuggestedText(res.suggestedMarkdown);
      setIsSuggestionOpen(true);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Não foi possível gerar a sugestão de estrutura com IA.'
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !version.trim() || !bodyText.trim()) {
      setErrorMessage('Preencha todos os campos obrigatórios (Título, Versão e Conteúdo).');
      return;
    }

    if (piiWarnings.length > 0) {
      const proceed = window.confirm(
        'Foram detectados possíveis dados pessoais (CPF, e-mail ou telefone). Tem certeza de que deseja publicar?'
      );
      if (!proceed) return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload: CreatePolicyPayload = {
      title: title.trim(),
      docType,
      version: version.trim(),
      publishDate: publishDate || undefined,
      effectiveFrom: effectiveFrom || undefined,
      effectiveTo: effectiveTo || undefined,
      audience,
      bodyText: bodyText.trim()
    };

    try {
      if (isEditing && id) {
        await knowledgeApi.updatePolicy(id, payload);
      } else {
        await knowledgeApi.createPolicy(payload);
      }
      navigate('/knowledge');
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Falha ao salvar e indexar a política.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Carregando dados da política...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Voltar e Cabeçalho */}
      <div className="flex items-center justify-between">
        <Link
          to="/knowledge"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Base de Conhecimento
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEditing ? `Nova Versão de Política` : 'Criar Nova Política Interna'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEditing
              ? `Editando a política existente: uma nova versão será publicada e a anterior se tornará histórica.`
              : 'Escreva a política corporativa diretamente na plataforma com suporte de IA para indexação imediata.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStructurePreview}
            disabled={!bodyText.trim() || isSuggesting}
            className="text-xs font-medium text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200"
          >
            {isSuggesting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            )}
            Sugerir estrutura com IA
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSaving}
            className="text-xs font-semibold"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isSaving ? 'Salvando...' : 'Publicar e Indexar'}
          </Button>
        </div>
      </div>

      {/* Alerta de Erro Geral */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Alerta de PII (LGPD) */}
      {piiWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Atenção LGPD:</span> Não inclua dados pessoais de
            colaboradores em políticas corporativas.
            <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
              {piiWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Metadados do Documento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Título da Política <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Política Interna de Trabalho Remoto e Híbrido"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tipo de Documento <span className="text-rose-500">*</span>
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="politica_interna">Política interna</option>
                <option value="acordo_convencao">Acordo / Convenção Coletiva</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Versão <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ex.: 1.0 ou 2026.1"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Público-Alvo (Escopo na IA) <span className="text-rose-500">*</span>
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="colaboradores">Colaboradores (Público no Chat)</option>
                <option value="rh">Somente RH (Restrito)</option>
                <option value="todos">Todos (RH e Colaboradores)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Data de Publicação
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Início da Vigência
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fim da Vigência (Opcional)
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                placeholder="Indeterminada"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Editor de Conteúdo Markdown */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col">
          {/* Barra de Ferramentas do Editor */}
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editor Markdown
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Visualização
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInsertTemplate}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 hover:text-blue-600 hover:bg-white rounded-md border border-slate-200 transition-colors"
                title="Insere um modelo com tópicos estruturados recomendados"
              >
                <FileText className="w-3.5 h-3.5" />
                Usar modelo padrão
              </button>

              <span className="text-[11px] text-slate-400 pl-2 border-l border-slate-200">
                {bodyText.length} caracteres
              </span>
            </div>
          </div>

          {/* Área de Edição ou Visualização */}
          {activeTab === 'edit' ? (
            <div className="p-3 sm:p-4">
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Escreva aqui o texto da política em formato Markdown. Exemplo: # Título, ## Seção, - Tópicos..."
                className="w-full min-h-[280px] sm:min-h-[400px] p-3 text-xs font-mono border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y"
              />
            </div>
          ) : (
            <div className="p-4 sm:p-6 min-h-[280px] sm:min-h-[400px] prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {bodyText.trim() ? (
                bodyText
              ) : (
                <span className="text-slate-400 italic">Nenhum conteúdo para visualizar.</span>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Diálogo de Sugestão de Estrutura pela IA */}
      <StructureSuggestionDialog
        isOpen={isSuggestionOpen}
        onClose={() => setIsSuggestionOpen(false)}
        originalText={bodyText}
        suggestedMarkdown={suggestedText}
        onApply={(newText) => setBodyText(newText)}
      />
    </div>
  );
};
