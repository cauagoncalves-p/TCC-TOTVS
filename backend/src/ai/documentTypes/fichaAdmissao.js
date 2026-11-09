// backend/src/ai/documentTypes/fichaAdmissao.js

const schemaDescription = `Retorne estritamente um JSON com o seguinte formato:
{
  "fullName": string | null,
  "cpf": string | null,
  "rg": string | null,
  "birthDate": string | null, // Formato YYYY-MM-DD
  "email": string | null,
  "phone": string | null,
  "zipCode": string | null, // Somente dígitos
  "street": string | null,
  "city": string | null,
  "state": string | null, // UF com 2 letras maiúsculas
  "jobTitle": string | null,
  "department": string | null,
  "hireDate": string | null, // Formato YYYY-MM-DD
  "baseSalary": number | null,
  "evidence": {
    "fullName": string | null,
    "cpf": string | null,
    "email": string | null,
    "phone": string | null
  }
}`;

module.exports = {
  id: 'ficha_admissao',
  label: 'Ficha de Admissão',
  priority: 1, // Prioridade mais alta na fusão cadastral
  classificationHint: 'Ficha de admissão, formulário cadastral de colaborador/funcionário ou registro admissional contendo dados pessoais e contratuais (cargo, departamento, data de admissão e salário).',
  schemaDescription,

  toCadastro(extracted) {
    if (!extracted) return {};
    return {
      fullName: extracted.fullName || null,
      cpf: extracted.cpf || null,
      rg: extracted.rg || null,
      birthDate: extracted.birthDate || null,
      email: extracted.email || null,
      phone: extracted.phone || null,
      zipCode: extracted.zipCode || null,
      street: extracted.street || null,
      city: extracted.city || null,
      state: extracted.state || null,
      jobTitle: extracted.jobTitle || null,
      department: extracted.department || null,
      hireDate: extracted.hireDate || null,
      baseSalary: extracted.baseSalary !== undefined && extracted.baseSalary !== null && !isNaN(Number(extracted.baseSalary))
        ? Number(extracted.baseSalary)
        : null
    };
  },

  toPerfil(extracted) {
    return null;
  }
};
