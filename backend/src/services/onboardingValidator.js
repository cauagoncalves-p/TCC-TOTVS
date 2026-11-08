// backend/src/services/onboardingValidator.js
const { poolPromise } = require('../config/db');

const VALID_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

/**
 * Valida o algoritmo de dígitos verificadores do CPF
 * @param {string} cpf - apenas dígitos
 * @returns {boolean}
 */
function isValidCpfDigits(cpf) {
  if (typeof cpf !== 'string') return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Valida formato de e-mail
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Valida data no formato YYYY-MM-DD
 */
function isValidIsoDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

/**
 * Calcula a idade em anos a partir de uma data de nascimento
 */
function calculateAge(birthDateStr) {
  const birth = new Date(birthDateStr + 'T00:00:00Z');
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

/**
 * Valida todos os campos extraídos ou revisados do candidato
 * @param {Object} data - Objeto de dados
 * @param {Object} [options]
 * @param {boolean} [options.checkDatabase=true] - Se deve checar unicidade no banco
 * @returns {Promise<Array<{field: string, code: string, message: string}>>}
 */
async function validateCandidateData(data, { checkDatabase = true } = {}) {
  const issues = [];
  const candidate = data || {};

  // 1. fullName (obrigatório)
  if (!candidate.fullName || typeof candidate.fullName !== 'string' || candidate.fullName.trim().length < 3) {
    issues.push({
      field: 'fullName',
      code: 'CAMPO_OBRIGATORIO',
      message: 'Nome completo é obrigatório e deve ter no mínimo 3 caracteres.'
    });
  }

  // 2. cpf (obrigatório, 11 dígitos, algoritmo válido)
  const rawCpf = candidate.cpf ? String(candidate.cpf).replace(/\D/g, '') : '';
  if (!rawCpf) {
    issues.push({
      field: 'cpf',
      code: 'CAMPO_OBRIGATORIO',
      message: 'CPF é obrigatório.'
    });
  } else if (!isValidCpfDigits(rawCpf)) {
    issues.push({
      field: 'cpf',
      code: 'CPF_INVALIDO',
      message: 'CPF inválido (dígitos verificadores incorretos ou tamanho inválido).'
    });
  } else if (checkDatabase) {
    try {
      const pool = await poolPromise;
      const res = await pool.request()
        .input('cpf', rawCpf)
        .query('SELECT 1 FROM Employees WHERE Cpf = @cpf');
      if (res.recordset.length > 0) {
        issues.push({
          field: 'cpf',
          code: 'CPF_DUPLICADO',
          message: 'Já existe um colaborador cadastrado com este CPF.'
        });
      }
    } catch (err) {
      console.error('Erro ao verificar duplicidade de CPF:', err.message);
    }
  }

  // 3. birthDate (obrigatório, YYYY-MM-DD, idade mínima 14 anos)
  if (!candidate.birthDate) {
    issues.push({
      field: 'birthDate',
      code: 'CAMPO_OBRIGATORIO',
      message: 'Data de nascimento é obrigatória.'
    });
  } else if (!isValidIsoDate(candidate.birthDate)) {
    issues.push({
      field: 'birthDate',
      code: 'DATA_INVALIDA',
      message: 'Data de nascimento deve estar no formato AAAA-MM-DD.'
    });
  } else {
    const age = calculateAge(candidate.birthDate);
    if (age < 14) {
      issues.push({
        field: 'birthDate',
        code: 'IDADE_MINIMA',
        message: `Idade mínima para admissão é de 14 anos (idade calculada: ${age} anos).`
      });
    }
  }

  // 4. email (obrigatório, formato válido, não existente em Users)
  if (!candidate.email) {
    issues.push({
      field: 'email',
      code: 'CAMPO_OBRIGATORIO',
      message: 'E-mail é obrigatório.'
    });
  } else if (!isValidEmail(candidate.email)) {
    issues.push({
      field: 'email',
      code: 'EMAIL_INVALIDO',
      message: 'Formato de e-mail inválido.'
    });
  } else if (checkDatabase) {
    try {
      const pool = await poolPromise;
      const res = await pool.request()
        .input('email', candidate.email.trim().toLowerCase())
        .query('SELECT 1 FROM users WHERE LOWER(email) = @email');
      if (res.recordset.length > 0) {
        issues.push({
          field: 'email',
          code: 'EMAIL_DUPLICADO',
          message: 'Este e-mail já está cadastrado para outro usuário.'
        });
      }
    } catch (err) {
      console.error('Erro ao verificar duplicidade de e-mail:', err.message);
    }
  }

  // 5. jobTitle (obrigatório)
  if (!candidate.jobTitle || typeof candidate.jobTitle !== 'string' || candidate.jobTitle.trim().length === 0) {
    issues.push({
      field: 'jobTitle',
      code: 'CAMPO_OBRIGATORIO',
      message: 'Cargo é obrigatório.'
    });
  }

  // 6. department (obrigatório)
  if (!candidate.department || typeof candidate.department !== 'string' || candidate.department.trim().length === 0) {
    issues.push({
      field: 'department',
      code: 'CAMPO_OBRIGATORIO',
      message: 'Departamento é obrigatório.'
    });
  }

  // 7. hireDate (obrigatório, YYYY-MM-DD, faixa razoável)
  if (!candidate.hireDate) {
    issues.push({
      field: 'hireDate',
      code: 'CAMPO_OBRIGATORIO',
      message: 'Data de admissão é obrigatória.'
    });
  } else if (!isValidIsoDate(candidate.hireDate)) {
    issues.push({
      field: 'hireDate',
      code: 'DATA_INVALIDA',
      message: 'Data de admissão deve estar no formato AAAA-MM-DD.'
    });
  } else {
    const hire = new Date(candidate.hireDate + 'T00:00:00Z');
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 10);
    const oneYearFuture = new Date();
    oneYearFuture.setFullYear(now.getFullYear() + 1);

    if (hire < tenYearsAgo || hire > oneYearFuture) {
      issues.push({
        field: 'hireDate',
        code: 'DATA_ADMISSAO_INVALIDA',
        message: 'Data de admissão não pode ser anterior a 10 anos nem posterior a 1 ano no futuro.'
      });
    }
  }

  // 8. state / UF (opcional, mas se vier deve ser válida)
  if (candidate.state) {
    const uf = String(candidate.state).trim().toUpperCase();
    if (!VALID_UFS.includes(uf)) {
      issues.push({
        field: 'state',
        code: 'UF_INVALIDA',
        message: `Estado/UF '${uf}' inválido. Deve ser uma sigla oficial de estado brasileiro.`
      });
    }
  }

  // 9. zipCode (opcional, mas se vier deve ter 8 dígitos)
  if (candidate.zipCode) {
    const cleanCep = String(candidate.zipCode).replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      issues.push({
        field: 'zipCode',
        code: 'CEP_INVALIDO',
        message: 'CEP deve conter exatamente 8 dígitos.'
      });
    }
  }

  // 10. baseSalary (opcional, mas se vier deve ser numérico >= 0)
  if (candidate.baseSalary !== undefined && candidate.baseSalary !== null && candidate.baseSalary !== '') {
    const num = Number(candidate.baseSalary);
    if (isNaN(num) || num < 0) {
      issues.push({
        field: 'baseSalary',
        code: 'SALARIO_INVALIDO',
        message: 'Salário base deve ser um valor numérico positivo.'
      });
    }
  }

  return issues;
}

/**
 * Avalia se existem problemas impeditivos para a aprovação
 * @param {Array<{code: string}>} issues
 * @returns {boolean}
 */
function isApprovalBlocked(issues) {
  if (!issues || issues.length === 0) return false;
  const blockingCodes = [
    'CAMPO_OBRIGATORIO',
    'CPF_INVALIDO',
    'CPF_DUPLICADO',
    'EMAIL_INVALIDO',
    'EMAIL_DUPLICADO',
    'DATA_INVALIDA',
    'IDADE_MINIMA',
    'DATA_ADMISSAO_INVALIDA'
  ];
  return issues.some(i => blockingCodes.includes(i.code));
}

module.exports = {
  isValidCpfDigits,
  isValidEmail,
  isValidIsoDate,
  validateCandidateData,
  isApprovalBlocked
};
