// frontend/src/features/onboarding/utils/issues.ts
import { ValidationIssue, IssueNature } from '../types';

export interface GroupedIssues {
  pendencias: ValidationIssue[];
  erros: ValidationIssue[];
  avisos: ValidationIssue[];
  gerais: ValidationIssue[];
  byField: Record<string, ValidationIssue[]>;
}

/**
 * Normaliza e identifica a natureza de uma inconsistência
 */
export function getIssueNature(issue: ValidationIssue): IssueNature {
  if (issue.nature) return issue.nature;

  const code = issue.code || '';
  if (code === 'CAMPO_OBRIGATORIO') {
    return 'pendente';
  }

  if (
    code.includes('INVALID') ||
    code.includes('DUPLICAD') ||
    code === 'IDADE_MINIMA' ||
    code === 'SALARIO_INVALIDO'
  ) {
    return 'erro';
  }

  return 'aviso';
}

/**
 * Agrupa as inconsistências para exibição no IssuesPanel e nos campos
 */
export function groupIssues(issues: ValidationIssue[] = []): GroupedIssues {
  const result: GroupedIssues = {
    pendencias: [],
    erros: [],
    avisos: [],
    gerais: [],
    byField: {}
  };

  issues.forEach((issue) => {
    const nature = getIssueNature(issue);

    if (nature === 'pendente') {
      result.pendencias.push(issue);
    } else if (nature === 'erro') {
      result.erros.push(issue);
    } else {
      result.avisos.push(issue);
    }

    if (issue.field) {
      if (!result.byField[issue.field]) {
        result.byField[issue.field] = [];
      }
      result.byField[issue.field].push(issue);
    } else {
      result.gerais.push(issue);
    }
  });

  return result;
}

/**
 * Nomes amigáveis dos campos do cadastro para exibição no IssuesPanel
 */
export const FIELD_LABELS: Record<string, string> = {
  fullName: 'Nome completo',
  cpf: 'CPF',
  rg: 'RG',
  birthDate: 'Data de nascimento',
  email: 'E-mail',
  phone: 'Telefone',
  zipCode: 'CEP',
  street: 'Logradouro / Endereço',
  city: 'Cidade',
  state: 'Estado (UF)',
  jobTitle: 'Cargo / Função',
  department: 'Departamento',
  hireDate: 'Data de admissão',
  baseSalary: 'Salário base'
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}
