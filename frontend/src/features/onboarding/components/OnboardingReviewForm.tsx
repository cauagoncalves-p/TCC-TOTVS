import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  ArrowLeft,
  Sparkles,
  FileText,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  OnboardingCaseDetail,
  CandidateData,
  ValidationIssue,
  OnboardingApprovalResult
} from '../../../types/api';
import {
  useUpdateOnboarding,
  useApproveOnboarding,
  useRejectOnboarding
} from '../hooks';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { DisclaimerBanner } from '../../../components/ui/DisclaimerBanner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../lib/formatters';

export interface OnboardingReviewFormProps {
  caseData: OnboardingCaseDetail;
  onRefresh?: () => void;
}

export const OnboardingReviewForm: React.FC<OnboardingReviewFormProps> = ({
  caseData,
  onRefresh
}) => {
  const navigate = useNavigate();

  // Dados do formulário
  const initialData: CandidateData = caseData.reviewedData || caseData.extractedData || {
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

  const [formData, setFormData] = useState<CandidateData>(initialData);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de modais e ações
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Modal com senha temporária ao aprovar
  const [approvalResult, setApprovalResult] = useState<OnboardingApprovalResult | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Sincroniza quando caseData muda
  useEffect(() => {
    if (caseData.reviewedData) {
      setFormData(caseData.reviewedData);
    }
  }, [caseData]);

  // Mutations
  const updateMutation = useUpdateOnboarding(caseData.id);
  const approveMutation = useApproveOnboarding(caseData.id);
  const rejectMutation = useRejectOnboarding(caseData.id);

  const isReadOnly = caseData.status !== 'pendente_revisao';

  // Mapeamento de pendências por campo
  const getFieldError = (fieldName: string): string | undefined => {
    const issue = caseData.validationIssues?.find((i) => i.field === fieldName);
    return issue ? issue.message : undefined;
  };

  const handleInputChange = (field: keyof CandidateData, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Salvar correções
  const handleSave = async () => {
    setSuccessToast(null);
    setErrorMessage(null);
    try {
      await updateMutation.mutateAsync(formData);
      setSuccessToast('Dados revisados salvos e revalidados com sucesso!');
      setTimeout(() => setSuccessToast(null), 4000);
      onRefresh?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao salvar alterações no caso.';
      setErrorMessage(msg);
    }
  };

  // Aprovar caso
  const handleConfirmApprove = async () => {
    setErrorMessage(null);
    try {
      const result = await approveMutation.mutateAsync();
      setIsApproveConfirmOpen(false);
      setApprovalResult(result);
      onRefresh?.();
    } catch (err: any) {
      setIsApproveConfirmOpen(false);
      const msg = err?.response?.data?.error || 'Falha ao aprovar admissão.';
      setErrorMessage(msg);
    }
  };

  // Rejeitar caso
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('O motivo da rejeição é obrigatório.');
      return;
    }
    setRejectionError(null);
    setErrorMessage(null);

    try {
      await rejectMutation.mutateAsync(rejectionReason.trim());
      setIsRejectModalOpen(false);
      setSuccessToast('Processo de admissão rejeitado.');
      onRefresh?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Falha ao rejeitar admissão.';
      setErrorMessage(msg);
    }
  };

  const copyPasswordToClipboard = () => {
    if (approvalResult?.initialPassword) {
      navigator.clipboard.writeText(approvalResult.initialPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 3000);
    }
  };

  const blockingIssues = caseData.validationIssues?.filter((i) =>
    ['CAMPO_OBRIGATORIO', 'CPF_INVALIDO', 'CPF_DUPLICADO', 'EMAIL_INVALIDO', 'EMAIL_DUPLICADO', 'DATA_INVALIDA', 'IDADE_MINIMA', 'DATA_ADMISSAO_INVALIDA'].includes(i.code)
  ) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header com navegação e status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding')}
            className="text-xs text-slate-500 hover:text-slate-800 gap-1.5 h-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para lista</span>
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Caso #{caseData.id}</span>
            <StatusBadge status={caseData.status} />
          </div>
        </div>

        {/* Botões de Ação */}
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              isLoading={updateMutation.isPending}
              disabled={updateMutation.isPending || approveMutation.isPending}
              className="gap-1.5 text-xs"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>Salvar Correções</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectionReason('');
                setRejectionError(null);
                setIsRejectModalOpen(true);
              }}
              disabled={updateMutation.isPending || approveMutation.isPending}
              className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <XCircle className="w-4 h-4" />
              <span>Rejeitar</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsApproveConfirmOpen(true)}
              disabled={!caseData.canApprove || updateMutation.isPending || approveMutation.isPending}
              isLoading={approveMutation.isPending}
              className="gap-1.5 text-xs"
              title={!caseData.canApprove ? 'Corrija os campos obrigatórios antes de aprovar' : 'Aprovar admissão e gerar cadastro'}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprovar Admissão</span>
            </Button>
          </div>
        )}
      </div>

      {/* Banner de Aviso Obrigatório */}
      <DisclaimerBanner type="onboarding" />

      {/* Status Bar Somente Leitura se Aprovado / Rejeitado */}
      {caseData.status === 'aprovado' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Admissão Aprovada com Sucesso</p>
              <p className="text-emerald-700">
                Colaborador ID #{caseData.employeeId} cadastrado no sistema. Este caso encontra-se finalizado e em modo somente leitura.
              </p>
            </div>
          </div>
          {caseData.reviewedAt && (
            <span className="text-emerald-700">Aprovado em {formatDate(caseData.reviewedAt)}</span>
          )}
        </div>
      )}

      {caseData.status === 'rejeitado' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5 text-xs">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Processo de Admissão Rejeitado</p>
            <p className="text-rose-700 mt-0.5">
              <span className="font-semibold">Motivo registrado:</span> {caseData.rejectionReason || 'Não informado.'}
            </p>
            {caseData.reviewedAt && (
              <span className="text-rose-600 block mt-1">Rejeitado em {formatDate(caseData.reviewedAt)}</span>
            )}
          </div>
        </div>
      )}

      {/* Toasts / Alertas de Sucesso e Erro */}
      {successToast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Card de Resumo de Inconsistências / Alertas da Validação */}
      {caseData.validationIssues && caseData.validationIssues.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs">
          <div className="flex items-center gap-2 mb-2 font-semibold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              {caseData.validationIssues.length} pendência(s) identificada(s) na validação dos dados:
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-800 pl-1">
            {caseData.validationIssues.map((issue, idx) => (
              <li key={idx}>
                <span className="font-semibold uppercase text-[10px] tracking-wide text-amber-900 bg-amber-200/60 px-1 py-0.5 rounded mr-1">
                  {issue.field}
                </span>
                {issue.message}
              </li>
            ))}
          </ul>
          {!isReadOnly && blockingIssues.length > 0 && (
            <p className="mt-2.5 pt-2 border-t border-amber-200/80 font-medium text-amber-950">
              * A aprovação está bloqueada até que todos os campos obrigatórios sejam corrigidos e salvos.
            </p>
          )}
        </div>
      )}

      {/* Grid do Formulário de Revisão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Formulário */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seção 1: Dados Pessoais */}
          <Card>
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-6">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>1. Dados Pessoais e Identificação</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nome Completo *"
                  value={formData.fullName || ''}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('fullName')}
                  placeholder="Nome completo do candidato"
                />
              </div>

              <div>
                <Input
                  label="CPF (completo para revisão) *"
                  value={formData.cpf || ''}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('cpf')}
                  placeholder="000.000.000-00 ou apenas dígitos"
                  helperText="Visualização integral para validação cadastral do DP"
                />
              </div>

              <div>
                <Input
                  label="RG"
                  value={formData.rg || ''}
                  onChange={(e) => handleInputChange('rg', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('rg')}
                  placeholder="Registro Geral"
                />
              </div>

              <div>
                <Input
                  type="date"
                  label="Data de Nascimento *"
                  value={formData.birthDate ? String(formData.birthDate).split('T')[0] : ''}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('birthDate')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção 2: Contato e Endereço */}
          <Card>
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-6">
              <CardTitle className="text-sm font-semibold">2. Contato e Endereço Residencial</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  type="email"
                  label="E-mail *"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('email')}
                  placeholder="candidato@exemplo.com"
                />
              </div>

              <div>
                <Input
                  label="Telefone / Celular *"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('phone')}
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Logradouro / Rua e Número"
                  value={formData.street || ''}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('street')}
                  placeholder="Av. Paulista, 1000 - Apto 42"
                />
              </div>

              <div>
                <Input
                  label="CEP"
                  value={formData.zipCode || ''}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('zipCode')}
                  placeholder="00000-000"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    label="Cidade"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={isReadOnly}
                    error={getFieldError('city')}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <Input
                    label="UF"
                    value={formData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                    maxLength={2}
                    error={getFieldError('state')}
                    placeholder="SP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Dados Contratuais */}
          <Card>
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-6">
              <CardTitle className="text-sm font-semibold">3. Dados Contratuais e Admissão</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Cargo / Função *"
                  value={formData.jobTitle || ''}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('jobTitle')}
                  placeholder="Ex: Desenvolvedor Pleno"
                />
              </div>

              <div>
                <Input
                  label="Departamento *"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('department')}
                  placeholder="Ex: Tecnologia"
                />
              </div>

              <div>
                <Input
                  type="date"
                  label="Data de Admissão *"
                  value={formData.hireDate ? String(formData.hireDate).split('T')[0] : ''}
                  onChange={(e) => handleInputChange('hireDate', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('hireDate')}
                />
              </div>

              <div>
                <Input
                  type="number"
                  step="0.01"
                  label="Salário Base (R$)"
                  value={formData.baseSalary !== undefined && formData.baseSalary !== null ? formData.baseSalary : ''}
                  onChange={(e) => handleInputChange('baseSalary', e.target.value)}
                  disabled={isReadOnly}
                  error={getFieldError('baseSalary')}
                  placeholder="Ex: 5000.00"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Metadados do Caso e Informações de Auditoria */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Metadados do Processo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Arquivo Original</span>
                <span className="text-slate-800 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  {caseData.sourceFileName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Data de Envio</span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {formatDate(caseData.createdAt)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Enviado por</span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {caseData.createdByName || 'Analista de RH'}
                </span>
              </div>

              {caseData.reviewedByName && (
                <div>
                  <span className="text-slate-400 block font-medium">Revisado por</span>
                  <span className="text-slate-800 font-medium mt-0.5 block">
                    {caseData.reviewedByName}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-400 block font-medium mb-1">Status de Aprovação</span>
                {caseData.canApprove ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Apto para aprovação</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Campos com pendência</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dica da Extração por IA */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Sparkles className="w-4 h-4" />
              <span>Extração Automatizada com Gemini</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              O motor de IA leu o documento PDF e estruturou os dados em conformidade com o esquema de admissão. Você pode alterar qualquer campo acima e clicar em <strong>Salvar Correções</strong> antes de aprovar.
            </p>
          </div>
        </div>
      </div>

      {/* Dialogo de Confirmação de Aprovação */}
      <ConfirmDialog
        isOpen={isApproveConfirmOpen}
        title="Confirmar Admissão do Colaborador"
        description={`Você está prestes a aprovar o cadastro de ${formData.fullName || 'este colaborador'}. Isso criará o registro oficial de funcionário (com matrícula) e o usuário de acesso.`}
        confirmLabel="Sim, Aprovar Admissão"
        cancelLabel="Cancelar"
        variant="primary"
        isLoading={approveMutation.isPending}
        onConfirm={handleConfirmApprove}
        onCancel={() => setIsApproveConfirmOpen(false)}
      />

      {/* Modal de Rejeição com Motivo Obrigatório */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Rejeitar Admissão</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informe o motivo pelo qual este documento ou processo está sendo rejeitado.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Motivo da Rejeição *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (e.target.value.trim()) setRejectionError(null);
                }}
                rows={3}
                placeholder="Ex.: Documento ilegível, CPF divergente do comprovante, ausência de assinatura..."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 placeholder-slate-400"
              />
              {rejectionError && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{rejectionError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={rejectMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                isLoading={rejectMutation.isPending}
                disabled={rejectMutation.isPending}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso com Senha Temporária */}
      {approvalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Colaborador Admitido!</h3>
                <p className="text-xs text-slate-500">Matrícula e usuário gerados com sucesso.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Matrícula Gerada:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {approvalResult.registration}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ID do Colaborador:</span>
                <span className="font-mono font-semibold text-slate-700">
                  #{approvalResult.employeeId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ID de Usuário (Login):</span>
                <span className="font-mono font-semibold text-slate-700">
                  #{approvalResult.userId}
                </span>
              </div>
            </div>

            {/* Senha Temporária com Botão de Copiar */}
            {approvalResult.initialPassword && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Senha Temporária de Acesso:</span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-200">
                  <span className="font-mono font-bold text-base text-slate-900 tracking-wider">
                    {approvalResult.initialPassword}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyPasswordToClipboard}
                    className="h-8 px-2.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 gap-1"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-amber-800">
                  Apresente esta senha temporária ao colaborador para que ele possa realizar o primeiro acesso ao Portal do Colaborador.
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setApprovalResult(null);
                  navigate('/onboarding');
                }}
                className="w-full text-xs"
              >
                Concluir e Voltar para Lista de Admissões
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
