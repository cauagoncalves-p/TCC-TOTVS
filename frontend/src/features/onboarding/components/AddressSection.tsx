// frontend/src/features/onboarding/components/AddressSection.tsx
import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { AlertCircle, Clock, Info } from 'lucide-react';
import { CandidateData, ValidationIssue } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { FieldProvenanceChip } from './FieldProvenanceChip';
import { ConflictHint } from './ConflictHint';
import { getFieldProvenance } from '../utils/provenance';
import { maskCep } from '../utils/masks';

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface AddressSectionProps {
  form: UseFormReturn<CandidateData>;
  extractedData?: Record<string, any> | null;
  issuesByField: Record<string, ValidationIssue[]>;
  isReadOnly?: boolean;
}

export const AddressSection: React.FC<AddressSectionProps> = ({
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
          2. Contato e Endereço Residencial
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CEP */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-zipCode" className="text-xs font-semibold text-slate-700">
              CEP
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('zipCode', extractedData, currentValues.zipCode)} />
          </div>
          <Controller
            name="zipCode"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-zipCode"
                disabled={isReadOnly}
                maxLength={9}
                placeholder="00000-000"
                value={maskCep(field.value)}
                onChange={(e) => field.onChange(maskCep(e.target.value))}
                className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.zipCode?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              />
            )}
          />
          {renderFieldStatus('zipCode')}
        </div>

        {/* Logradouro */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-street" className="text-xs font-semibold text-slate-700">
              Logradouro (Rua, Número, Complemento)
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('street', extractedData, currentValues.street)} />
          </div>
          <Controller
            name="street"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-street"
                disabled={isReadOnly}
                placeholder="Ex.: Av. Paulista, 1000 - Apto 42"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              />
            )}
          />
          {renderFieldStatus('street')}
        </div>

        {/* Cidade */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-city" className="text-xs font-semibold text-slate-700">
              Cidade
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('city', extractedData, currentValues.city)} />
          </div>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="field-city"
                disabled={isReadOnly}
                placeholder="Ex.: São Paulo"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              />
            )}
          />
          {renderFieldStatus('city')}
        </div>

        {/* Estado (UF) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="field-state" className="text-xs font-semibold text-slate-700">
              Estado (UF)
            </label>
            <FieldProvenanceChip provenance={getFieldProvenance('state', extractedData, currentValues.state)} />
          </div>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="field-state"
                disabled={isReadOnly}
                value={field.value ? field.value.toUpperCase() : ''}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  issuesByField.state?.some((i) => i.nature === 'erro')
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 text-rose-950'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 text-slate-900'
                } disabled:bg-slate-50 disabled:text-slate-500`}
              >
                <option value="">Selecione...</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            )}
          />
          {renderFieldStatus('state')}
        </div>
      </CardContent>
    </Card>
  );
};
