// backend/src/services/onboardingNormalizer.js

const MONTH_MAP = {
  jan: '01', janeiro: '01', january: '01',
  fev: '02', fevereiro: '02', feb: '02', february: '02',
  mar: '03', marco: '03', março: '03', march: '03',
  abr: '04', abril: '04', apr: '04', april: '04',
  mai: '05', maio: '05', may: '05',
  jun: '06', junho: '06', june: '06',
  jul: '07', julho: '07', july: '07',
  ago: '08', agosto: '08', aug: '08', august: '08',
  set: '09', setembro: '09', sep: '09', september: '09',
  out: '10', outubro: '10', oct: '10', october: '10',
  nov: '11', novembro: '11', november: '11',
  dez: '12', dezembro: '12', dec: '12', december: '12'
};

const CURRENT_TERMS = ['atual', 'presente', 'hoje', 'ate o momento', 'até o momento', 'atualmente', 'current', 'present'];

/**
 * Normaliza uma representação de data para YYYY-MM-DD ou YYYY-MM
 */
function normalizeDate(val) {
  if (!val || typeof val !== 'string') return null;
  const s = val.trim();
  const lower = s.toLowerCase();

  // Verifica se é termo indicador de data atual
  if (CURRENT_TERMS.some(t => lower.includes(t))) {
    return null;
  }

  // Já em YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // Já em YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) {
    return s;
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // MM/YYYY ou MM-YYYY
  const myMatch = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (myMatch) {
    const m = myMatch[1].padStart(2, '0');
    const y = myMatch[2];
    return `${y}-${m}`;
  }

  // Mes/Ano textual: ex "Maio/2025", "Maio de 2025", "Fev 2023"
  const textMonthMatch = s.match(/^([a-zA-ZçÇáÁéÉíÍóÓúÚãÃõÕ]{3,})[/\s]+(?:de\s+)?(\d{4})$/i);
  if (textMonthMatch) {
    const cleanMonth = textMonthMatch[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const m = MONTH_MAP[cleanMonth] || MONTH_MAP[cleanMonth.slice(0, 3)];
    if (m) {
      return `${textMonthMatch[2]}-${m}`;
    }
  }

  // Tenta parse por Date
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return s;
}

/**
 * Normaliza string removendo espaços excessivos
 */
function cleanString(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return String(val).trim();
  const s = val.trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;
  return s;
}

/**
 * Normaliza dados extraídos segundo o tipo de documento
 */
function normalizeExtractedData(docType, rawData) {
  if (!rawData || typeof rawData !== 'object') return {};

  if (docType === 'ficha_admissao') {
    const d = { ...rawData };
    d.fullName = cleanString(d.fullName);
    d.cpf = d.cpf ? String(d.cpf).replace(/\D/g, '') : null;
    d.rg = cleanString(d.rg);
    d.birthDate = normalizeDate(d.birthDate);
    d.email = cleanString(d.email);
    d.phone = cleanString(d.phone);
    d.zipCode = d.zipCode ? String(d.zipCode).replace(/\D/g, '') : null;
    d.street = cleanString(d.street);
    d.city = cleanString(d.city);
    d.state = d.state ? String(d.state).trim().toUpperCase().slice(0, 2) : null;
    d.jobTitle = cleanString(d.jobTitle);
    d.department = cleanString(d.department);
    d.hireDate = normalizeDate(d.hireDate);
    if (d.baseSalary !== undefined && d.baseSalary !== null && d.baseSalary !== '') {
      const num = Number(String(d.baseSalary).replace(/[R$\s.]/g, '').replace(',', '.'));
      d.baseSalary = !isNaN(num) ? num : null;
    } else {
      d.baseSalary = null;
    }
    return d;
  }

  if (docType === 'curriculo') {
    const d = { ...rawData };
    d.personal = d.personal || {};
    d.personal.fullName = cleanString(d.personal.fullName);
    d.personal.email = cleanString(d.personal.email);
    d.personal.phone = cleanString(d.personal.phone);
    d.personal.city = cleanString(d.personal.city);
    d.personal.state = d.personal.state ? String(d.personal.state).trim().toUpperCase().slice(0, 2) : null;
    d.personal.links = Array.isArray(d.personal.links) ? d.personal.links.map(cleanString).filter(Boolean) : [];

    d.summary = cleanString(d.summary);

    // Normaliza education
    if (Array.isArray(d.education)) {
      d.education = d.education.map(ed => {
        const ongoing = !!ed.ongoing || CURRENT_TERMS.some(t => String(ed.endDate || '').toLowerCase().includes(t));
        return {
          course: cleanString(ed.course) || '',
          institution: cleanString(ed.institution) || '',
          level: ed.level || 'outro',
          startDate: normalizeDate(ed.startDate),
          endDate: ongoing ? null : normalizeDate(ed.endDate),
          ongoing
        };
      });
    } else {
      d.education = [];
    }

    // Normaliza experience
    if (Array.isArray(d.experience)) {
      d.experience = d.experience.map(exp => {
        const isCurrent = !!exp.current || CURRENT_TERMS.some(t => String(exp.endDate || '').toLowerCase().includes(t));
        return {
          role: cleanString(exp.role) || '',
          company: cleanString(exp.company) || '',
          startDate: normalizeDate(exp.startDate),
          endDate: isCurrent ? null : normalizeDate(exp.endDate),
          current: isCurrent,
          duties: Array.isArray(exp.duties) ? exp.duties.map(cleanString).filter(Boolean) : []
        };
      });
    } else {
      d.experience = [];
    }

    d.skills = Array.isArray(d.skills) ? d.skills.map(cleanString).filter(Boolean) : [];
    d.certifications = Array.isArray(d.certifications) ? d.certifications.map(cleanString).filter(Boolean) : [];

    if (Array.isArray(d.languages)) {
      d.languages = d.languages.map(l => ({
        language: cleanString(l.language) || '',
        level: cleanString(l.level) || 'Intermediario'
      }));
    } else {
      d.languages = [];
    }

    if (Array.isArray(d.projects)) {
      d.projects = d.projects.map(p => ({
        name: cleanString(p.name) || '',
        technologies: Array.isArray(p.technologies) ? p.technologies.map(cleanString).filter(Boolean) : [],
        description: cleanString(p.description) || ''
      }));
    } else {
      d.projects = [];
    }

    return d;
  }

  if (docType === 'outro') {
    const d = { ...rawData };
    d.title = cleanString(d.title);
    d.summary = cleanString(d.summary);
    d.fields = Array.isArray(d.fields)
      ? d.fields.map(f => ({ label: cleanString(f.label) || '', value: cleanString(f.value) || '' }))
      : [];
    return d;
  }

  return rawData;
}

/**
 * Normaliza texto para busca textual sem acentos, minúsculo e apenas alfanuméricos
 */
function normalizeForSearch(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se os valores extraídos possuem evidência literal no texto do PDF
 * @param {string} docType
 * @param {Object} extractedData
 * @param {string} documentText
 * @returns {{ evidenceReport: Object, issues: Array }}
 */
function verifyEvidence(docType, extractedData, documentText) {
  const issues = [];
  const report = {
    docType,
    status: 'concluido',
    verified: [],
    unverified: []
  };

  if (!documentText || typeof documentText !== 'string' || documentText.trim().length === 0) {
    report.status = 'indisponivel';
    report.message = 'Documento escaneado ou sem camada de texto selecionável. Verificação de evidência indisponível.';
    return { evidenceReport: report, issues };
  }

  const normalizedDocText = normalizeForSearch(documentText);
  const rawDigitsDoc = documentText.replace(/\D/g, '');

  const fieldsToCheck = [];

  if (docType === 'ficha_admissao') {
    if (extractedData.fullName) {
      fieldsToCheck.push({ field: 'fullName', value: extractedData.fullName, evidence: extractedData.evidence?.fullName });
    }
    if (extractedData.cpf) {
      fieldsToCheck.push({ field: 'cpf', value: extractedData.cpf, isDigitsOnly: true, evidence: extractedData.evidence?.cpf });
    }
    if (extractedData.email) {
      fieldsToCheck.push({ field: 'email', value: extractedData.email, evidence: extractedData.evidence?.email });
    }
    if (extractedData.phone) {
      fieldsToCheck.push({ field: 'phone', value: extractedData.phone, isPhone: true, evidence: extractedData.evidence?.phone });
    }
  } else if (docType === 'curriculo') {
    const personal = extractedData.personal || {};
    if (personal.fullName) {
      fieldsToCheck.push({ field: 'fullName', value: personal.fullName, evidence: extractedData.evidence?.fullName });
    }
    if (personal.email) {
      fieldsToCheck.push({ field: 'email', value: personal.email, evidence: extractedData.evidence?.email });
    }
    if (personal.phone) {
      fieldsToCheck.push({ field: 'phone', value: personal.phone, isPhone: true, evidence: extractedData.evidence?.phone });
    }
  }

  for (const item of fieldsToCheck) {
    let found = false;

    // 1. Testa evidência literal indicada pela IA
    if (item.evidence) {
      const normEv = normalizeForSearch(item.evidence);
      if (normEv && normalizedDocText.includes(normEv)) {
        found = true;
      }
    }

    // 2. Testa valor do campo normalizado
    if (!found && item.value) {
      const normVal = normalizeForSearch(item.value);
      if (normVal && normalizedDocText.includes(normVal)) {
        found = true;
      }
    }

    // 3. Para CPF ou números: verifica dígitos no texto bruto
    if (!found && item.isDigitsOnly && item.value) {
      const cleanDigits = String(item.value).replace(/\D/g, '');
      if (cleanDigits.length >= 8 && rawDigitsDoc.includes(cleanDigits)) {
        found = true;
      }
    }

    // 4. Para telefone: verifica os dígitos do telefone
    if (!found && item.isPhone && item.value) {
      const cleanDigits = String(item.value).replace(/\D/g, '');
      if (cleanDigits.length >= 8 && rawDigitsDoc.includes(cleanDigits.slice(-8))) {
        found = true;
      }
    }

    if (found) {
      report.verified.push(item.field);
    } else {
      report.unverified.push(item.field);
      issues.push({
        field: item.field,
        code: 'VALUE_NOT_IN_DOCUMENT',
        nature: 'aviso',
        message: `O valor do campo '${item.field}' não foi localizado textualmente no documento original.`
      });
    }
  }

  return { evidenceReport: report, issues };
}

module.exports = {
  normalizeDate,
  cleanString,
  normalizeExtractedData,
  verifyEvidence
};
