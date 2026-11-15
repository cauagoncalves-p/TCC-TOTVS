// frontend/src/features/onboarding/components/CaseForm.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  FileText,
  User,
  FolderOpen
} from 'lucide-react';
import {
  OnboardingCaseDetail,
  CandidateData,
  ValidationIssue,
  OnboardingApprovalResult
} from '../types';
import {
  useUpdateOnboarding,
  useCreateManualOnboarding,
  useApproveOnboarding,
  useRejectOnboarding,
  useValidateCadastro
} from '../hooks';
import { PersonalSection } from './PersonalSection';
import { AddressSection } from './AddressSection';
import { ContractSection } from './ContractSection';
import { IssuesPanel } from './IssuesPanel';
import { ApproveDialog } from './ApproveDialog';
import { RejectDialog } from './RejectDialog';
import { CredentialsDialog } from './CredentialsDialog';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { DisclaimerBanner } from '../../../components/ui/DisclaimerBanner';
import { groupIssues } from '../utils/issues';
import { hasAnyAiExtractedData } from '../utils/provenance';
import { formatDate } from '../../../lib/formatters';

export interface CaseFormProps {
  initialCase?: OnboardingCaseDetail;
  isNewManual?: boolean;
  onRefresh?: () => void;
}

export const CaseForm: React.FC<CaseFormProps> = ({
  initialCase,
  isNewManual = false,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cadastro' | 'perfil' | 'documentos'>('cadastro');

  // Estado dos dados iniciais
  const initialValues: CandidateData = useMemo(() => {
    if (!initialCase) {
      return {
        fullName: '',
        cpf: '',
        rg: '',
        birthDate: '',
        email: '',
        phone: '',
        zipCode: '',
        street: '',
        city: '',
        state: '',
        jobTitle: '',
        department: '',
        hireDate: '',
        baseSalary: ''
      };
    }

    const reviewed = initialCase.reviewedData?.cadastro || initialCase.reviewedData || {};
    const extracted = initialCase.extractedData?.cadastro || initialCase.extractedData || {};

    return {
      fullName: reviewed.fullName ?? extracted.fullName ?? '',
      cpf: reviewed.cpf ?? extracted.cpf ?? '',
      rg: reviewed.rg ?? extracted.rg ?? '',
      birthDate: reviewed.birthDate ?? extracted.birthDate ?? '',
      email: reviewed.email ?? extracted.email ?? '',
      phone: reviewed.phone ?? extracted.phone ?? '',
      zipCode: reviewed.zipCode ?? extracted.zipCode ?? '',
      street: reviewed.street ?? extracted.street ?? '',
      city: reviewed.city ?? extracted.city ?? '',
      state: reviewed.state ?? extracted.state ?? '',
      jobTitle: reviewed.jobTitle ?? extracted.jobTitle ?? '',
      department: reviewed.department ?? extracted.department ?? '',
      hireDate: reviewed.hireDate ?? extracted.hireDate ?? '',
      baseSalary: reviewed.baseSalary ?? extracted.baseSalary ?? ''
    };
  }, [initialCase]);

  // React Hook Form
  const form = useForm<CandidateData>({
    defaultValues: initialValues,
    mode: 'onChange'
  });

  const { formState: { isDirty }, watch, reset } = form;
  const currentFormValues = watch();

  // Redefine form quando o initialCase mudar
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  // Validação em tempo real (debounce ~600ms e descarte de respostas antigas)
  const { validate, isValidating, validationResult, setValidationResult } = useValidateCadastro(600);

  // Issues salvas que vieram do backend
  const [savedIssues, setSavedIssues] = useState<ValidationIssue[]>(
    initialCase?.validationIssues || []
  );

  useEffect(() => {
    if (initialCase?.validationIssues) {
      setSavedIssues(initialCase.validationIssues);
    }
  }, [initialCase]);

  // Dispara validação em tempo real sempre que o formulário alterar
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Não valida se for somente leitura
    if (initialCase && initialCase.status !== 'pendente_revisao') return;

    validate(currentFormValues);
  }, [currentFormValues, initialCase, validate]);

  // Issues efetivas: resultado da validação em tempo real sobrepõe as salvas quando disponível
  const effectiveIssues = validationResult ? validationResult.validationIssues : savedIssues;
  const groupedIssues = useMemo(() => groupIssues(effectiveIssues), [effectiveIssues]);

  // Pode aprovar: só quando não houver erro nem pendência obrigatória
  const canApprove = validationResult !== null
    ? validationResult.canApprove
    : (initialCase ? initialCase.canApprove : false);

  // Mutations
  const createMutation = useCreateManualOnboarding();
  const updateMutation = useUpdateOnboarding(initialCase?.id || 0);
  const approveMutation = useApproveOnboarding(initialCase?.id || 0);
  const rejectMutation = useRejectOnboarding(initialCase?.id || 0);

  // Modais e diálogos
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [approvalResult, setApprovalResult] = useState<OnboardingApprovalResult | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isReadOnly = initialCase ? initialCase.status !== 'pendente_revisao' : false;
  const isAiDocumentCase = initialCase ? hasAnyAiExtractedData(initialCase.extractedData) : false;

  // Mostra toast temporário
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  // Salvar Rascunho
  const handleSaveDraft = async () => {
    setFeedbackToast(null);

    try {
      if (isNewManual) {
        const created = await createMutation.mutateAsync({
          cadastro: currentFormValues
        });
        showToast('Rascunho salvo.');
        navigate(`/onboarding/${created.id}`);
      } else if (initialCase) {
        const updated = await updateMutation.mutateAsync({
          cadastro: currentFormValues
        });
        setSavedIssues(updated.validationIssues || []);
        setValidationResult(null);
        showToast('Rascunho salvo.');
        onRefresh?.();
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        showToast('Este caso já foi processado por outra pessoa.', 'error');
        onRefresh?.();
      } else {
        const msg = err?.response?.data?.error || 'Erro ao salvar o rascunho do caso.';
        showToast(msg, 'error');
      }
    }
  };

  // Aprovar
  const handleConfirmApprove = async () => {
    if (!initialCase) return;
    try {
      const result = await approveMutation.mutateAsync();
      setIsApproveOpen(false);
      setApprovalResult(result);
      onRefresh?.();
    } catch (err: any) {
      setIsApproveOpen(false);
      if (err?.response?.status === 409) {
        showToast('Este caso já foi processado por outra pessoa.', 'error');
        onRefresh?.();
      } else {
        const msg = err?.response?.data?.error || 'Falha ao aprovar admissão.';
        showToast(msg, 'error');
      }
    }
  };

  // Rejeitar
  const handleConfirmReject = async (reason: string) => {
    if (!initialCase) return;
    try {
      await rejectMutation.mutateAsync(reason);
      setIsRejectOpen(false);
      showToast('Processo de admissão rejeitado.');
      onRefresh?.();
    } catch (err: any) {
      setIsRejectOpen(false);
      if (err?.response?.status === 409) {
        showToast('Este caso já foi processado por outra pessoa.', 'error');
        onRefresh?.();
      } else {
        const msg = err?.response?.data?.error || 'Falha ao rejeitar admissão.';
        showToast(msg, 'error');
      }
    }
  };

  // Voltar com confirmação se houver dados alterados
  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'Você possui alterações não salvas no formulário. Deseja realmente sair?'
      );
      if (!confirmLeave) return;
    }
    navigate('/onboarding');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra superior de navegação e ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-xs text-slate-500 hover:text-slate-800 gap-1.5 h-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            {isNewManual ? (
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Novo Preenchimento Manual
              </span>
            ) : (
              <>
                <span className="text-xs font-mono text-slate-500">Caso #{initialCase?.id}</span>
                <span className="text-xs font-semibold text-slate-800 truncate max-w-xs">
                  {initialCase?.reviewedData?.cadastro?.fullName || initialCase?.extractedData?.cadastro?.fullName || 'Sem nome'}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    initialCase?.origin === 'manual'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {initialCase?.origin === 'manual' ? 'Manual' : 'PDF'}
                </span>
                {initialCase?.status && <StatusBadge status={initialCase.status} />}
              </>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              isLoading={createMutation.isPending || updateMutation.isPending}
              disabled={createMutation.isPending || updateMutation.isPending || approveMutation.isPending}
              className="gap-1.5 text-xs"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>Salvar rascunho</span>
            </Button>

            {!isNewManual && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectOpen(true)}
                  disabled={createMutation.isPending || updateMutation.isPending || approveMutation.isPending}
                  className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Rejeitar</span>
                </Button>

                <div
                  title={
                    !canApprove
                      ? 'Para aprovar, corrija os erros e preencha os campos obrigatórios.'
                      : 'Aprovar admissão e gerar acessos'
                  }
                >
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setIsApproveOpen(true)}
                    disabled={!canApprove || createMutation.isPending || updateMutation.isPending || approveMutation.isPending}
                    isLoading={approveMutation.isPending}
                    className="gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Aviso de IA: aparece SÓ quando há campos vindos de documento */}
      {isAiDocumentCase && (
        <DisclaimerBanner type="onboarding" />
      )}

      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
          )}
          <span className="font-medium">{feedbackToast.message}</span>
        </div>
      )}

      {/* Faixa de Status Somente Leitura se Aprovado / Rejeitado */}
      {initialCase?.status === 'aprovado' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold text-sm">Admissão Aprovada</p>
              <p className="text-emerald-700">
                Colaborador admitido no sistema (Matrícula / ID #{initialCase.employeeId}). Este caso encontra-se finalizado em modo somente leitura.
              </p>
            </div>
          </div>
          {initialCase.reviewedAt && (
            <span className="text-emerald-800 text-[11px] font-medium">
              Aprovado por {initialCase.reviewedByName || 'RH'} em {formatDate(initialCase.reviewedAt)}
            </span>
          )}
        </div>
      )}

      {initialCase?.status === 'rejeitado' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs">
          <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-sm">Processo de Admissão Rejeitado</p>
            <p className="text-rose-800 mt-1">
              <span className="font-semibold">Motivo:</span> {initialCase.rejectionReason || 'Não informado.'}
            </p>
            {initialCase.reviewedAt && (
              <span className="text-rose-700 block mt-1 text-[11px]">
                Rejeitado por {initialCase.reviewedByName || 'RH'} em {formatDate(initialCase.reviewedAt)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('cadastro')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'cadastro'
              ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Cadastro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'perfil'
              ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Perfil profissional</span>
          <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documentos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'documentos'
              ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Documentos</span>
          {initialCase?.documents && (
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {initialCase.documents.length}
            </span>
          )}
        </button>
      </div>

      {/* Grid Principal: Formulário + Painel Lateral Fixo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'cadastro' && (
            <>
              <PersonalSection
                form={form}
                extractedData={initialCase?.extractedData}
                issuesByField={groupedIssues.byField}
                isReadOnly={isReadOnly}
              />

              <AddressSection
                form={form}
                extractedData={initialCase?.extractedData}
                issuesByField={groupedIssues.byField}
                isReadOnly={isReadOnly}
              />

              <ContractSection
                form={form}
                extractedData={initialCase?.extractedData}
                issuesByField={groupedIssues.byField}
                isReadOnly={isReadOnly}
              />
            </>
          )}

          {activeTab === 'perfil' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-blue-500 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">Perfil Profissional</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                O perfil profissional é opcional. Na Fase F2b será possível extrair dados automaticamente de currículos em PDF ou preencher competências, idiomas e experiências.
              </p>
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Documentos Anexados ao Caso</h4>
                  <p className="text-xs text-slate-500">Histórico de arquivos e fichas processados</p>
                </div>
              </div>

              {!initialCase?.documents || initialCase.documents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">Nenhum documento anexado a este caso (caso preenchido manualmente).</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {initialCase.documents.map((doc) => (
                    <li key={doc.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-800 block">{doc.fileName}</span>
                          <span className="text-[11px] text-slate-500">
                            Tipo: {doc.documentType} • Origem: {doc.typeSource === 'ia' ? 'IA' : 'Analista'} • {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Coluna Lateral Fixa: Painel de Situação do Cadastro */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <IssuesPanel
            groupedIssues={groupedIssues}
            canApprove={canApprove}
            isValidating={isValidating}
            onFocusField={(field) => {
              setActiveTab('cadastro');
              setTimeout(() => {
                const el = document.getElementById(`field-${field}`);
                if (el) {
                  el.focus();
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 50);
            }}
          />

          {/* Card de metadados quando o caso existe */}
          {initialCase && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 text-xs space-y-2 text-slate-600 shadow-2xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block border-b border-slate-100 pb-1">
                Auditoria do Caso
              </span>
              <div className="flex justify-between">
                <span className="text-slate-400">Criado por:</span>
                <span className="font-medium text-slate-700">{initialCase.createdByName || 'Sistema'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Criado em:</span>
                <span className="font-medium text-slate-700">{formatDate(initialCase.createdAt)}</span>
              </div>
              {initialCase.reviewedByName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Revisado por:</span>
                  <span className="font-medium text-slate-700">{initialCase.reviewedByName}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de Confirmação de Aprovação */}
      <ApproveDialog
        isOpen={isApproveOpen}
        candidateData={currentFormValues}
        isLoading={approveMutation.isPending}
        onConfirm={handleConfirmApprove}
        onCancel={() => setIsApproveOpen(false)}
      />

      {/* Diálogo de Rejeição */}
      <RejectDialog
        isOpen={isRejectOpen}
        isLoading={rejectMutation.isPending}
        onConfirm={handleConfirmReject}
        onCancel={() => setIsRejectOpen(false)}
      />

      {/* Diálogo de Sucesso com Senha Temporária em Memória */}
      {approvalResult && (
        <CredentialsDialog
          isOpen={!!approvalResult}
          approvalResult={approvalResult}
          candidateEmail={currentFormValues.email}
          onClose={() => {
            setApprovalResult(null);
            navigate('/onboarding');
          }}
        />
      )}
    </div>
  );
};
