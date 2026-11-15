// frontend/src/features/onboarding/components/ContractSection.tsx
import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { AlertCircle, Clock, Info } from 'lucide-react';
import { CandidateData, ValidationIssue } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { FieldProvenanceChip } from './FieldProvenanceChip';
import { ConflictHint } from './ConflictHint';
import { getFieldProvenance } from '../utils/provenance';

interface ContractSectionProps {
  form: UseFormReturn<CandidateData>;
  extractedData?: Record<string, any> | null;
  issuesByField: Record<string, ValidationIssue[]>;
  isReadOnly?: boolean;
}

export const ContractSection: React.FC<ContractSectionProps> = ({
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
          3. Dados Contratuais e Admissão
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cargo / Função */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-jobTitle" className="text-xs font-semibold text-slate-700">
              Cargo / Função <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('jobTitle', extractedData, currentValues.jobTitle)} />
          </div>
          <Controller
            name="jobTitle"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-jobTitle"
                disabled={isReadOnly}
                placeholder="Ex.: Analista de RH Pleno"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.jobTitle?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('jobTitle')}
          {getConflict('jobTitle') && (
            <ConflictHint
              conflictValues={getConflict('jobTitle')?.conflictValues}
              message={getConflict('jobTitle')?.message}
              onSelectValue={(val) => setValue('jobTitle', val, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          )}
        </div>

        {/* Departamento */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-department" className="text-xs font-semibold text-slate-700">
              Departamento <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('department', extractedData, currentValues.department)} />
          </div>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-department"
                disabled={isReadOnly}
                placeholder="Ex.: Recursos Humanos"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.department?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('department')}
          {getConflict('department') && (
            <ConflictHint
              conflictValues={getConflict('department')?.conflictValues}
              message={getConflict('department')?.message}
              onSelectValue={(val) => setValue('department', val, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          )}
        </div>

        {/* Data de Admissão */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-hireDate" className="text-xs font-semibold text-slate-700">
              Data de Admissão <span className="text-rose-600">*</span>
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('hireDate', extractedData, currentValues.hireDate)} />
          </div>
          <Controller
            name="hireDate"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                {...field}
                value={field.value ? String(field.value).split('T')[0] : ''}
                id="field-hireDate"
                disabled={isReadOnly}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.hireDate?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('hireDate')}
          {getConflict('hireDate') && (
            <ConflictHint
              conflictValues={getConflict('hireDate')?.conflictValues}
              message={getConflict('hireDate')?.message}
              onSelectValue={(val) => setValue('hireDate', val, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          )}
        </div>

        {/* Salário Base */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-baseSalary" className="text-xs font-semibold text-slate-700">
              Salário Base (R$)
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('baseSalary', extractedData, currentValues.baseSalary)} />
          </div>
          <Controller
            name="baseSalary"
            control={control}
            render={({ field }) => (
              <input
                type="number"
                step="0.01"
                min="0"
                {...field}
                value={field.value !== undefined && field.value !== null ? field.value : ''}
                id="field-baseSalary"
                disabled={isReadOnly}
                placeholder="Ex.: 6500.00"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.baseSalary?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('baseSalary')}
        </div>
      </CardContent>
    </Card>
  );
};
