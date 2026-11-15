# Contrato de API: TOTVS RH Inteligente

> Baseado na implementação real do backend (`backend/src/routes` e `backend/src/controllers`).
> Base URL: `http://localhost:3001`
> Autenticação: Header `Authorization: Bearer <token_jwt>` (retornado em `/api/auth/login`).

---

## 1. Autenticação & Perfil

### `POST /api/auth/login`
- **Acesso**: Público
- **Body**:
  ```json
  { "email": "string", "password": "string" }
  ```
- **Sucesso (200)**:
  ```json
  { 
    "token": "string (JWT contendo id e role, expiração 8h)",
    "mustChangePassword": "boolean (true se exigir troca imediata de senha temporária)"
  }
  ```
- **Erro (400/401)**: `{ "error": "Credenciais inválidas" }`

### `POST /api/auth/change-password`
- **Acesso**: Autenticado (qualquer perfil; permitido mesmo com `MustChangePassword = 1`)
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string (mínimo 8 caracteres, com letras e números, diferente da atual e fora de senhas comuns)"
  }
  ```
- **Sucesso (200)**:
  ```json
  { "message": "Senha alterada com sucesso." }
  ```
- **Erro (400)**: `{ "error": "string" }`

### `GET /api/me`
- **Acesso**: Autenticado (`colaborador`, `rh`, `gestor`)
- **Headers**: `Authorization: Bearer <token>`
- **Sucesso (200)**:
  ```json
  {
    "FullName": "string",
    "JobTitle": "string",
    "Department": "string",
    "HireDate": "YYYY-MM-DD"
  }
  ```

---

## 2. Chatbot de RH (Portal do Colaborador)

### `POST /api/chat`
- **Acesso**: Autenticado (`colaborador`, `rh`, `gestor`)
- **Body**:
  ```json
  {
    "sessionId": "UUID (opcional - cria nova sessão se omitido)",
    "message": "string (1 a 1000 caracteres)"
  }
  ```
- **Sucesso (200)**:
  ```json
  {
    "sessionId": "UUID",
    "reply": "string",
    "toolUsed": "string | null"
  }
  ```
- **Erro (400/502)**: `{ "error": "string" }`

### `GET /api/chat/sessions/:id/messages`
- **Acesso**: Autenticado (somente o próprio usuário dono da sessão)
- **Sucesso (200)**:
  ```json
  {
    "sessionId": "UUID",
    "messages": [
      {
        "Id": "number",
        "Role": "user | model",
        "Content": "string",
        "ToolUsed": "string | null",
        "CreatedAt": "ISO8601"
      }
    ]
  }
  ```

---

## 3. Onboarding com IA (DP / RH)

- **Acesso em todas as rotas**: Perfil `rh` (outros recebem 403)

### `POST /api/onboarding/upload`
- **Content-Type**: `multipart/form-data`
- **Body**: campo `file` contendo arquivo PDF (máx. 5 MB)
- **Sucesso (201)**:
  ```json
  {
    "id": 1,
    "status": "pendente_revisao",
    "sourceFileName": "ficha.pdf",
    "extractedData": {
      "fullName": "string", "cpf": "string", "rg": "string",
      "birthDate": "YYYY-MM-DD", "email": "string", "phone": "string",
      "zipCode": "string", "street": "string", "city": "string", "state": "UF",
      "jobTitle": "string", "department": "string", "hireDate": "YYYY-MM-DD",
      "baseSalary": 6500.00
    },
    "validationIssues": [
      { "field": "string", "code": "string", "message": "string" }
    ],
    "canApprove": false,
    "createdAt": "ISO8601"
  }
  ```

### `GET /api/onboarding`
- **Query**: `status` (opcional: `pendente_revisao`, `aprovado`, `rejeitado`)
- **Sucesso (200)**:
  ```json
  {
    "cases": [
      {
        "Id": 1,
        "Status": "pendente_revisao",
        "SourceFileName": "ficha.pdf",
        "CreatedAt": "ISO8601",
        "ReviewedAt": "ISO8601 | null",
        "EmployeeId": "number | null",
        "CreatedByName": "string",
        "ReviewedByName": "string | null"
      }
    ]
  }
  ```

### `GET /api/onboarding/:id`
- **Sucesso (200)**: detalhes do caso incluindo `extractedData`, `reviewedData`, `validationIssues`, `canApprove`.

### `PUT /api/onboarding/:id`
- **Body**: objeto completo corrigido pelo analista
- **Sucesso (200)**: `{ "id": 1, "status": "pendente_revisao", "reviewedData": {...}, "validationIssues": [...], "canApprove": boolean }`
- **Erro (409)**: caso já aprovado/rejeitado não pode ser alterado

### `POST /api/onboarding/:id/approve`
- **Sucesso (200)**:
  ```json
  {
    "message": "Colaborador admitido e cadastrado com sucesso!",
    "caseId": 1,
    "userId": 5,
    "employeeId": 3,
    "registration": "M0003",
    "initialPassword": "string"
  }
  ```
- **Erro (422)**: bloqueado enquanto houver campos obrigatórios inconsistentes
- **Erro (409)**: caso já aprovado/finalizado

### `POST /api/onboarding/:id/reject`
- **Body**: `{ "reason": "string (obrigatório)" }`
- **Sucesso (200)**: `{ "message": "string", "caseId": 1, "status": "rejeitado" }`

---

## 4. Central de Inteligência Preditiva (Analytics & Alertas)

- **Acesso**: Perfis `gestor` e `rh` (colaborador recebe 403)

### `GET /api/analytics/departments`
- **Sucesso (200)**:
  ```json
  {
    "departments": [
      { "Id": 1, "Name": "Atendimento", "IsActive": true }
    ]
  }
  ```

### `GET /api/analytics/summary`
- **Query**: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `departmentId` (número)
- **Sucesso (200)**:
  ```json
  {
    "period": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "monthsCount": 12 },
    "departmentId": 1,
    "cards": {
      "absenceRate": { "value": 4.5, "unit": "%", "delta": 0.8 },
      "overtimePerEmployee": { "value": 14.2, "unit": "h/colaborador", "delta": 2.1 },
      "turnoverRate": { "value": 3.8, "unit": "%", "delta": -0.4 },
      "activeAlerts": { "value": 3, "unit": "alertas" }
    },
    "totals": {
      "avgHeadcount": 52,
      "totalAbsenceDays": 450.0,
      "totalOvertimeHours": 7500.0,
      "totalHires": 12,
      "totalTerminations": 8
    }
  }
  ```

### `GET /api/analytics/timeseries`
- **Query**: `from`, `to`, `departmentId`
- **Sucesso (200)**:
  ```json
  {
    "timeseries": [
      {
        "Id": 1,
        "DepartmentId": 1,
        "DepartmentName": "Atendimento",
        "MonthRef": "2026-01-01",
        "Headcount": 52,
        "WorkDays": 22,
        "AbsenceDays": 35.5,
        "OvertimeHours": 450.0,
        "Hires": 1,
        "Terminations": 1,
        "AbsenceRate": 3.1,
        "OvertimePerEmployee": 8.65,
        "TurnoverRate": 1.92
      }
    ]
  }
  ```

### `GET /api/analytics/by-department`
- **Query**: `month` (opcional, padrão: último mês com dados)
- **Sucesso (200)**:
  ```json
  {
    "month": "2026-10-01",
    "departments": [
      {
        "DepartmentId": 1,
        "DepartmentName": "Atendimento",
        "MonthRef": "2026-10-01",
        "Headcount": 50,
        "AbsenceRate": 8.8,
        "OvertimePerEmployee": 23.5,
        "TurnoverRate": 10.0
      }
    ]
  }
  ```

### `GET /api/analytics/hotspots`
- **Sucesso (200)**:
  ```json
  {
    "hotspots": [
      {
        "DepartmentId": 1,
        "DepartmentName": "Atendimento",
        "ActiveAlertsCount": 2,
        "HighRiskCount": 2,
        "ModerateRiskCount": 0,
        "LowRiskCount": 0,
        "RiskScore": 6
      }
    ]
  }
  ```

### `POST /api/alerts/generate`
- **Acesso**: `gestor`, `rh`
- **Sucesso (200)**:
  ```json
  {
    "message": "Motor de regras executado com sucesso.",
    "referenceMonth": "2026-10-01",
    "departmentsEvaluated": 6,
    "newAlertsGenerated": 4,
    "alerts": [...]
  }
  ```

### `GET /api/alerts`
- **Query**: `status` (`novo`, `lido`, `resolvido`), `risk` (`baixo`, `moderado`, `alto`), `departmentId`
- **Sucesso (200)**:
  ```json
  {
    "alerts": [
      {
        "Id": 1,
        "DepartmentId": 1,
        "DepartmentName": "Atendimento",
        "RuleCode": "ABS_OT_UP",
        "RiskLevel": "alto",
        "Source": "regra",
        "ReferenceMonth": "2026-10-01",
        "IndicatorsJson": "string",
        "indicators": { "currentAbsenceRate": 8.8, "currentOvertime": 23.5 },
        "Justification": "string",
        "Recommendation": "string",
        "Status": "novo",
        "CreatedAt": "ISO8601"
      }
    ]
  }
  ```

### `PATCH /api/alerts/:id`
- **Body**: `{ "status": "lido | resolvido" }`
- **Sucesso (200)**: alerta atualizado

---

## 5. TOTVS Compliance Inteligente

- **Leitura (GET)**: `rh`, `gestor`
- **Ações (POST / PATCH)**: exclusivamente `rh` (gestor recebe 403)
- **Colaborador**: 403 em tudo

### `GET /api/compliance/rules`
- **Query**: `category` (`integridade`, `clt`, `esocial`), `isActive`
- **Sucesso (200)**:
  ```json
  {
    "rules": [
      {
        "Id": 1,
        "Code": "EMP_REQ_FIELDS",
        "Category": "integridade",
        "EventCode": null,
        "Severity": "alta",
        "Title": "string",
        "Description": "string",
        "Guidance": "string",
        "SourceType": "interna | oficial",
        "SourceReference": "string",
        "SourceVerified": false,
        "IsActive": true
      }
    ]
  }
  ```

### `POST /api/compliance/runs` (somente `rh`)
- **Body**: `{ "scope": "cadastros | esocial", "eventCode": "S-2200 | S-2230 | S-2299 (opcional)" }`
- **Sucesso (201)**:
  ```json
  {
    "runId": "UUID",
    "scope": "cadastros",
    "recordsAnalyzed": 30,
    "issuesNew": 12,
    "issuesOpen": 12,
    "finishedAt": "ISO8601"
  }
  ```

### `GET /api/compliance/runs`
- **Query**: `limit`
- **Sucesso (200)**: `{ "runs": [...] }`

### `GET /api/compliance/issues`
- **Query**: `status` (`aberta`, `corrigida`, `ignorada`), `priority` (`baixa`, `media`, `alta`), `eventCode`, `employeeId`, `department`
- **Sucesso (200)**:
  ```json
  {
    "issues": [
      {
        "Id": 1,
        "RuleId": 1,
        "RuleCode": "EMP_REQ_FIELDS",
        "RuleTitle": "Campos cadastrais obrigatórios ausentes",
        "RuleCategory": "integridade",
        "Guidance": "string",
        "SourceType": "interna",
        "SourceReference": "Regra interna do sistema",
        "SourceVerified": true,
        "EmployeeId": 2,
        "EmployeeName": "Colaborador Teste",
        "EmployeeRegistration": "S0001",
        "EmployeeDepartment": "Atendimento",
        "EntityType": "employee",
        "EntityId": 2,
        "EventCode": null,
        "Priority": "alta",
        "Description": "string",
        "Status": "aberta",
        "DetectedAt": "ISO8601"
      }
    ]
  }
  ```

### `PATCH /api/compliance/issues/:id` (somente `rh`)
- **Body**: `{ "status": "corrigida | ignorada", "resolutionNote": "string (obrigatório se status=ignorada)" }`
- **Sucesso (200)**: issue atualizada

### `GET /api/compliance/esocial/events`
- **Query**: `status` (`pendente`, `com_inconsistencias`, `pronto_para_envio`, `enviado_simulado`), `eventCode`
- **Sucesso (200)**: `{ "events": [...] }`

### `POST /api/compliance/esocial/events/:id/confirm` (somente `rh`)
- **Sucesso (200)**: `{ "message": "string", "event": { ... "Status": "enviado_simulado" } }`
- **Erro (422)**: Bloqueado se houver inconsistências de prioridade alta abertas associadas ao evento
- **Erro (409)**: Evento já confirmado

### `GET /api/compliance/audit-log`
- **Query**: `limit`, `offset`
- **Sucesso (200)**: `{ "total": 24, "limit": 50, "offset": 0, "logs": [...] }`

---

## 7. Administração de Usuários e Perfis (F11)

### `GET /api/admin/users`
- **Acesso**: Autenticado (somente `rh`)
- **Query Params**:
  - `search` (opcional): string para busca por e-mail, nome do colaborador ou matrícula
  - `role` (opcional): `colaborador` | `rh` | `gestor`
  - `active` (opcional): `true` | `false`
  - `page` (opcional, padrão 1): number
  - `limit` (opcional, padrão 20): number
- **Sucesso (200)**:
  ```json
  {
    "users": [
      {
        "id": 1,
        "email": "ana.souza@exemplo.com",
        "role": "colaborador",
        "isActive": true,
        "mustChangePassword": false,
        "lastLoginAt": "ISO8601 | null",
        "createdAt": "ISO8601",
        "employee": {
          "id": 1,
          "fullName": "Ana Souza",
          "registration": "M0001",
          "jobTitle": "Analista de Suporte",
          "department": "Tecnologia",
          "status": "ativo"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### `POST /api/admin/users`
- **Acesso**: Autenticado (somente `rh`)
- **Body**:
  ```json
  {
    "employeeId": 1,
    "email": "novo.colaborador@exemplo.com",
    "role": "colaborador | rh | gestor"
  }
  ```
- **Sucesso (201)**:
  ```json
  {
    "message": "Usuário criado com sucesso.",
    "user": {
      "id": 5,
      "email": "novo.colaborador@exemplo.com",
      "role": "colaborador",
      "isActive": true,
      "mustChangePassword": true,
      "employeeId": 1
    },
    "tempPassword": "string (exibida apenas uma única vez na resposta)"
  }
  ```
- **Erro (400/404/409)**: `{ "error": "string" }`

### `PATCH /api/admin/users/:id`
- **Acesso**: Autenticado (somente `rh`)
- **Body**:
  ```json
  {
    "role": "colaborador | rh | gestor (opcional)",
    "isActive": "boolean (opcional)"
  }
  ```
- **Sucesso (200)**:
  ```json
  {
    "message": "Usuário atualizado com sucesso.",
    "user": {
      "id": 2,
      "email": "bruno.lima@exemplo.com",
      "role": "colaborador",
      "isActive": false,
      "mustChangePassword": false,
      "lastLoginAt": "ISO8601 | null"
    }
  }
  ```
- **Erro (400/403/404)**: `{ "error": "string" }`
  - Proteções: 403 se tentar alterar o próprio perfil ou se auto-inativar; 400 se tentar inativar ou alterar o perfil do último usuário de RH ativo.

### `POST /api/admin/users/:id/reset-password`
- **Acesso**: Autenticado (somente `rh`)
- **Sucesso (200)**:
  ```json
  {
    "message": "Senha resetada com sucesso.",
    "tempPassword": "string (exibida apenas uma única vez na resposta)",
    "mustChangePassword": true
  }
  ```
- **Erro (400/404)**: `{ "error": "string" }`


---

## 8. Base de Conhecimento Trabalhista e Políticas (RAG)

### `GET /api/knowledge/documents`
- **Acesso**: Autenticado (`rh`, `gestor`)
- **Query Params**:
  - `type`: `clt | esocial_manual | esocial_leiaute | nota_tecnica | acordo_convencao | politica_interna | outro` (opcional)
  - `status`: `indexado | processando | falhou` (opcional)
  - `archived`: `boolean` (opcional, padrão `false`)
  - `q`: `string` (termo de busca no título, versão ou arquivo)
  - `page`: `number` (padrão 1)
  - `limit`: `number` (padrão 50)
- **Sucesso (200)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "Política de Aprendizes em Eventos Externos",
        "docType": "politica_interna",
        "sourceOrg": "RH Corporativo",
        "sourceUrl": null,
        "version": "2026.1",
        "publishedAt": "2026-02-01",
        "effectiveFrom": null,
        "effectiveTo": null,
        "isCurrent": true,
        "fileName": "politica_aprendizes_eventos_externos.pdf",
        "uploadedBy": 3,
        "uploadedAt": "2026-11-14T21:00:00Z",
        "audience": "todos",
        "sourceKind": "arquivo",
        "bodyText": null,
        "indexStatus": "indexado",
        "indexError": null,
        "chunkCount": 3,
        "extractionMethod": "texto",
        "sizeBytes": 20480,
        "isArchived": false,
        "updatedAt": null,
        "previousVersionId": null
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 50, "pages": 1 }
  }
  ```

### `POST /api/knowledge/documents`
- **Acesso**: Autenticado (somente `rh`)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Arquivo PDF (máx 20 MB, assinatura `%PDF` obrigatória)
  - `title`: `string` (obrigatório)
  - `docType`: `clt | esocial_manual | esocial_leiaute | nota_tecnica | acordo_convencao | politica_interna | outro`
  - `version`: `string` (obrigatório)
  - `publishDate`: `YYYY-MM-DD` (opcional)
  - `effectiveFrom`: `YYYY-MM-DD` (opcional)
  - `effectiveTo`: `YYYY-MM-DD` (opcional)
  - `audience`: `rh | colaboradores | todos` (padrão `rh`)
  - `sourceOrg`: `string` (opcional, ex: "Interno")
- **Sucesso (201)**:
  ```json
  {
    "message": "Documento enviado e indexado com sucesso.",
    "document": {
      "id": 1,
      "title": "string",
      "docType": "string",
      "version": "string",
      "audience": "todos",
      "indexStatus": "indexado",
      "chunkCount": 4,
      "pageCount": 1,
      "extractionMethod": "texto | ocr_ia",
      "previousVersionId": null,
      "piiWarnings": []
    }
  }
  ```
- **Erro (400/413/422/500)**: `{ "error": "string" }`

### `GET /api/knowledge/documents/:id`
- **Acesso**: Autenticado (`rh`, `gestor`)
- **Sucesso (200)**: Objeto do documento completo, incluindo `bodyText` caso seja política escrita.

### `GET /api/knowledge/documents/:id/chunks`
- **Acesso**: Autenticado (`rh`, `gestor`)
- **Query Params**: `page` (padrão 1), `limit` (padrão 30)
- **Sucesso (200)**:
  ```json
  {
    "document": {
      "id": 1,
      "title": "string",
      "version": "string",
      "chunkCount": 3,
      "indexStatus": "indexado"
    },
    "chunks": [
      {
        "id": 10,
        "documentId": 1,
        "chunkIndex": 0,
        "page": 1,
        "sectionRef": "Art. 1 ou Item 1.1",
        "content": "Conteúdo do trecho textual..."
      }
    ],
    "pagination": { "total": 3, "page": 1, "limit": 30, "pages": 1 }
  }
  ```

### `POST /api/knowledge/policies`
- **Acesso**: Autenticado (somente `rh`)
- **Body**:
  ```json
  {
    "title": "string",
    "docType": "politica_interna | acordo_convencao",
    "version": "string",
    "publishDate": "YYYY-MM-DD",
    "effectiveFrom": "YYYY-MM-DD",
    "effectiveTo": "YYYY-MM-DD",
    "audience": "rh | colaboradores | todos",
    "bodyText": "string (Markdown)"
  }
  ```
- **Sucesso (201)**: `{ "message": "Política criada e indexada com sucesso.", "policy": { ... } }`

### `PUT /api/knowledge/policies/:id`
- **Acesso**: Autenticado (somente `rh`)
- **Comportamento**: Gera uma nova versão do documento; a versão anterior recebe `isCurrent = false` e `effectiveTo = data_atual`.
- **Sucesso (200)**: `{ "message": "Nova versão da política criada e indexada com sucesso.", "policy": { ... } }`

### `POST /api/knowledge/policies/structure-preview`
- **Acesso**: Autenticado (somente `rh`)
- **Body**: `{ "rawText": "string" }`
- **Sucesso (200)**:
  ```json
  {
    "suggestedMarkdown": "string (Markdown formatado em tópicos e FAQ)",
    "disclaimer": "string"
  }
  ```

### `PATCH /api/knowledge/documents/:id`
- **Acesso**: Autenticado (somente `rh`)
- **Body**: `{ "audience"?, "effectiveFrom"?, "effectiveTo"?, "isCurrent"?, "isArchived"?, "title"?, "version"? }`
- **Sucesso (200)**: `{ "message": "Documento atualizado com sucesso.", "document": { ... } }`

### `POST /api/knowledge/documents/:id/reindex`
- **Acesso**: Autenticado (somente `rh`)
- **Sucesso (200)**: `{ "message": "Documento reindexado com sucesso.", "result": { ... } }`

### `POST /api/knowledge/test-question`
- **Acesso**: Autenticado (`rh`, `gestor`)
- **Body**:
  ```json
  {
    "question": "string",
    "audienceScope": "rh | colaborador | todos"
  }
  ```
- **Sucesso (200)**:
  ```json
  {
    "reply": "string (Resposta detalhada da IA com citação)",
    "sources": [
      {
        "title": "string",
        "docType": "string",
        "version": "string",
        "section": "string",
        "page": 1,
        "publishedAt": "DD/MM/YYYY",
        "score": 8.5
      }
    ],
    "unconfirmed": false,
    "chunks": [
      {
        "id": 12,
        "documentId": 1,
        "title": "string",
        "page": 1,
        "sectionRef": "string",
        "score": 8.5,
        "content": "Trecho que fundamentou a resposta..."
      }
    ]
  }
  ```

### `POST /api/compliance/assistant/chat`
- **Acesso**: Autenticado (`rh`, `gestor`)
- **Body**: `{ "message": "string", "history": [] }`
- **Sucesso (200)**:
  ```json
  {
    "reply": "string",
    "sources": [ ... ],
    "nao_confirmada": false,
    "chunks": [ ... ]
  }
  ```
