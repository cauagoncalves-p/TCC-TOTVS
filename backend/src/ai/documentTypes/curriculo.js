// backend/src/ai/documentTypes/curriculo.js

const schemaDescription = `Retorne estritamente um JSON com o seguinte formato:
{
  "personal": {
    "fullName": string | null,
    "email": string | null,
    "phone": string | null,
    "city": string | null,
    "state": string | null, // Sigla UF de 2 letras maiúsculas ou null
    "links": string[] // links para linkedin, github, portfolio, lattes etc.
  },
  "summary": string | null,
  "education": [
    {
      "course": string,
      "institution": string,
      "level": "tecnico" | "graduacao" | "pos" | "curso_livre" | "outro",
      "startDate": string | null, // YYYY-MM ou YYYY-MM-DD
      "endDate": string | null,   // YYYY-MM ou YYYY-MM-DD ou null se em andamento
      "ongoing": boolean
    }
  ],
  "experience": [
    {
      "role": string,
      "company": string,
      "startDate": string | null, // YYYY-MM ou YYYY-MM-DD
      "endDate": string | null,   // YYYY-MM ou YYYY-MM-DD ou null se atual
      "current": boolean,         // true se 'Atual', 'Presente', 'Até o momento'
      "duties": string[]
    }
  ],
  "skills": string[],
  "certifications": string[],
  "languages": [
    {
      "language": string,
      "level": string // ex: 'Basico', 'Intermediario', 'Avancado', 'Fluente', 'Nativo'
    }
  ],
  "projects": [
    {
      "name": string,
      "technologies": string[],
      "description": string
    }
  ],
  "evidence": {
    "fullName": string | null,
    "email": string | null,
    "phone": string | null
  }
}`;

module.exports = {
  id: 'curriculo',
  label: 'Currículo Profissional',
  priority: 4, // ficha_admissao > documento_identidade > comprovante_residencia > curriculo > outro
  classificationHint: 'Currículo, Curriculum Vitae (CV) ou resumo profissional contendo histórico acadêmico/educação, experiências profissionais, competências/habilidades, certificações, idiomas ou projetos.',
  schemaDescription,

  toCadastro(extracted) {
    if (!extracted) return {};
    const personal = extracted.personal || {};
    return {
      fullName: personal.fullName || null,
      email: personal.email || null,
      phone: personal.phone || null,
      city: personal.city || null,
      state: personal.state || null
    };
  },

  toPerfil(extracted) {
    if (!extracted) return null;
    return {
      summary: extracted.summary || null,
      education: Array.isArray(extracted.education) ? extracted.education : [],
      experience: Array.isArray(extracted.experience) ? extracted.experience : [],
      skills: Array.isArray(extracted.skills) ? extracted.skills : [],
      certifications: Array.isArray(extracted.certifications) ? extracted.certifications : [],
      languages: Array.isArray(extracted.languages) ? extracted.languages : [],
      projects: Array.isArray(extracted.projects) ? extracted.projects : []
    };
  }
};
