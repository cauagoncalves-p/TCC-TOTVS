// frontend/src/features/onboarding/components/PersonalSection.tsx
import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { AlertCircle, Clock, Info } from 'lucide-react';
import { CandidateData, ValidationIssue } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { FieldProvenanceChip } from './FieldProvenanceChip';
import { ConflictHint } from './ConflictHint';
import { getFieldProvenance } from '../utils/provenance';
import { maskCpf, maskPhone } from '../utils/masks';

interface PersonalSectionProps {
  form: UseFormReturn<CandidateData>;
  extractedData?: Record<string, any> | null;
  issuesByField: Record<string, ValidationIssue[]>;
  isReadOnly?: boolean;
}

export const PersonalSection: React.FC<PersonalSectionProps> = ({
  form,
  extractedData,
  issuesByField,
  isReadOnly = false
}) => {
  const { control, setValue, watch } = form;
  const currentValues = watch();

  const renderFieldStatus = (fieldName: keyof CandidateData) => {
    const issues = issuesByField[fieldName] || [];
    if (issues.length === 0) return null;

    const errorIssue = issues.find((i) => i.nature === 'erro');
    const pendingIssue = issues.find((i) => i.nature === 'pendente');
    const warningIssue = issues.find((i) => i.nature === 'aviso');

    const issue = errorIssue || pendingIssue || warningIssue;
    if (!issue) return null;

    if (issue.nature === 'erro') {
      return (
        <p id={`${fieldName}-error`} className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" aria-hidden="true" />
          <span>{issue.message}</span>
        </p>
      );
    }

    if (issue.nature === 'pendente') {
      return (
        <p id={`${fieldName}-pending`} className="mt-1 text-xs text-amber-700 flex items-center gap-1 font-medium">
          <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{issue.message}</span>
        </p>
      );
    }

    return (
      <p id={`${fieldName}-warning`} className="mt-1 text-xs text-blue-700 flex items-center gap-1">
        <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" aria-hidden="true" />
        <span>{issue.message}</span>
      </p>
    );
  };

  const getConflict = (fieldName: keyof CandidateData) => {
    const issues = issuesByField[fieldName] || [];
    return issues.find((i) => i.code === 'FIELD_CONFLICT' || i.conflictValues);
  };

  return (
    <Card className="border border-slate-200/80 shadow-2xs">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60 py-3.5 px-6">
        <CardTitle className="text-sm font-semibold text-slate-800">
          1. Dados Pessoais e Identificação
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nome Completo */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-fullName" className="text-xs font-semibold text-slate-700">
              Nome Completo <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('fullName', extractedData, currentValues.fullName)} />
          </div>
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-fullName"
                disabled={isReadOnly}
                placeholder="Ex.: Maria Souza de Oliveira"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.fullName?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('fullName')}
          {getConflict('fullName') && (
            <ConflictHint
              conflictValues={getConflict('fullName')?.conflictValues}
              message={getConflict('fullName')?.message}
              onSelectValue={(val) => setValue('fullName', val, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          )}
        </div>

        {/* CPF */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-cpf" className="text-xs font-semibold text-slate-700">
              CPF <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('cpf', extractedData, currentValues.cpf)} />
          </div>
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-cpf"
                disabled={isReadOnly}
                maxLength={14}
                placeholder="000.000.000-00"
                value={maskCpf(field.value)}
                onChange={(e) => field.onChange(maskCpf(e.target.value))}
                className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.cpf?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('cpf')}
          {getConflict('cpf') && (
            <ConflictHint
              conflictValues={getConflict('cpf')?.conflictValues}
              message={getConflict('cpf')?.message}
              onSelectValue={(val) => setValue('cpf', val, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          )}
        </div>

        {/* RG */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-rg" className="text-xs font-semibold text-slate-700">
              RG
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('rg', extractedData, currentValues.rg)} />
          </div>
          <Controller
            name="rg"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                value={field.value || ''}
                id="field-rg"
                disabled={isReadOnly}
                placeholder="Registro Geral"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              />
            )}
          />
          {renderFieldStatus('rg')}
        </div>

        {/* Data de Nascimento */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-birthDate" className="text-xs font-semibold text-slate-700">
              Data de Nascimento <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('birthDate', extractedData, currentValues.birthDate)} />
          </div>
          <Controller
            name="birthDate"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                {...field}
                value={field.value ? String(field.value).split('T')[0] : ''}
                id="field-birthDate"
                disabled={isReadOnly}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.birthDate?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('birthDate')}
          {getConflict('birthDate') && (
            <ConflictHint
              conflictValues={getConflict('birthDate')?.conflictValues}
              message={getConflict('birthDate')?.message}
              onSelectValue={(val) => setValue('birthDate', val, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          )}
        </div>

        {/* E-mail */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-email" className="text-xs font-semibold text-slate-700">
              E-mail (Login de Acesso) <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('email', extractedData, currentValues.email)} />
          </div>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <input
                type="email"
                {...field}
                id="field-email"
                disabled={isReadOnly}
                placeholder="colaborador@empresa.com"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.email?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('email')}
          {getConflict('email') && (
            <ConflictHint
              conflictValues={getConflict('email')?.conflictValues}
              message={getConflict('email')?.message}
              onSelectValue={(val) => setValue('email', val, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          )}
        </div>

        {/* Telefone */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-phone" className="text-xs font-semibold text-slate-700">
              Telefone / Celular <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('phone', extractedData, currentValues.phone)} />
          </div>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-phone"
                disabled={isReadOnly}
                placeholder="(00) 00000-0000"
                value={maskPhone(field.value)}
                onChange={(e) => field.onChange(maskPhone(e.target.value))}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.phone?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('phone')}
        </div>
      </CardContent>
    </Card>
  );
};
