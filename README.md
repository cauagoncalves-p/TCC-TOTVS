# TOTVS RH Inteligente

Plataforma inteligente de Recursos Humanos desenvolvida como solução corporativa integrando autoatendimento conversacional para colaboradores, admissão digital universal com inteligência artificial, analytics preditivo de indicadores de pessoas, auditoria contínua de compliance trabalhista/eSocial e base de conhecimento unificada com RAG (Retrieval-Augmented Generation).

---

## 1. Pré-Requisitos

- **Node.js**: v18.0.0 ou superior (recomendado v20+)
- **NPM**: v9.0.0 ou superior
- **SQL Server**: 2019 ou superior (Express, Developer ou Standard) na porta `1434` (ou padrão `1433`)
- **Python**: 3.10 ou superior *(necessário apenas para o microserviço preditivo ML da Fase B)*
- **Chave de API do Google Gemini**: Obtida no Google AI Studio (modelo recomendado: `gemini-2.5-flash`)

---

## 2. Banco de Dados: Ordem dos Scripts SQL

Os scripts devem ser executados em ordem sequencial no banco de dados SQL Server (`TotvsRhInteligenteDb`):

1. **`database/001_chatbot_schema.sql`**  
   Criação das estruturas essenciais: tabelas `Users`, `Employees`, `Payslips`, `PayslipItems`, `Vacations`, `ChatSessions` e `ChatMessages`.
2. **`database/002_onboarding_schema.sql`**  
   Criação da tabela `OnboardingCases`, sequence de matrícula `EmployeeRegistrationSeq` e campos cadastrais em `Employees`.
3. **`database/003_analytics_schema.sql`**  
   Estruturas analíticas: `Departments`, métricas mensais agregadas `DepartmentMonthlyMetrics`, alertas de risco `Alerts` e projeções `Predictions`.
4. **`database/004_compliance_schema.sql`**  
   Auditoria trabalhista: catálogo de regras `ComplianceRules`, ciclos de execução `ComplianceRuns`, apontamentos `ComplianceIssues`, eventos eSocial `EsocialEvents` e trilha de auditoria `ComplianceAuditLog`.
5. **`database/005_onboarding_universal.sql`**  
   Extensão do onboarding universal: tabela de documentos anexos `OnboardingDocuments`, perfis profissionais `EmployeeProfiles` e controle de fusão cadastral.
6. **`database/006_onboarding_manual.sql`**  
   Suporte a preenchimento manual sem PDF: ajustes de nulabilidade para `Origin` e rastreabilidade cadastral unificada.
7. **`database/007_user_admin.sql`**  
   Módulo de administração de usuários: listagem corporativa, criação e bloqueio de contas.
8. **`database/008_auth_hardening.sql`**  
   Segurança e autenticação: política de primeiro acesso (`MustChangePassword`) e carimbo de último login (`LastLoginAt`).
9. **`database/009_email_outbox.sql`**  
   Fila de saída de e-mails transacionais (boas-vindas, redefinição de senha).
10. **`database/010_seed_demo_passwords.sql`**  
    Carga de senhas iniciais e hashes para o ambiente demonstrativo.
11. **`database/011_knowledge_policies.sql`**  
    Base de Conhecimento e Políticas: suporte a RAG, escopo por público (`Audience`), `SourceKind` (arquivo PDF ou texto Markdown), `IndexStatus`, `ChunkCount`, `ExtractionMethod` (texto ou `ocr_ia`), `IsArchived`, versionamento e histórico.

---

## 3. Massa de Dados e Seed Mestre (Parte 8B)

A carga oficial e coerente de dados do sistema é fornecida via scripts SQL versionados na pasta `database/`:

1. **`database/S00_reset.sql`**: Limpeza segura e reversível exclusiva dos dados marcados pelo seed.
2. **`database/S01_pessoas.sql`**: 150 colaboradores (`S0001` a `S0150`), usuários do seed, holerites, saldos de férias e afastamentos.
3. **`database/S02_inteligencia.sql`**: 24 meses de métricas departamentais e cenários plantados (`SeedExpectedAlerts`).
4. **`database/S03_compliance.sql`**: Regras de conformidade, defeitos plantados e eventos eSocial (`SeedExpectedDefects`).
5. **`database/S04_obrigacoes_notificacoes.sql`**: Obrigações de folha/eSocial e notificações com datas relativas à execução.
6. **`database/S05_onboarding.sql`**: Casos de admissão aprovados, pendentes e rejeitados.
7. **`database/S06_conhecimento.sql`**: Políticas internas indexadas na base de conhecimento.

> **Importante (Scripts Obsoletos):**
> Os scripts `backend/scripts/seedAnalytics.js` e `backend/scripts/seedCompliance.js` tornaram-se **OBSOLETOS** e **NÃO** devem ser executados, para evitar sobrescrever a massa coerente do seed mestre SQL.

### Scripts de Inspeção e Verificação (Somente Leitura)

A partir da pasta `backend`:

```bash
cd backend

# 1. Definir/atualizar senhas de demonstração com hash bcrypt (senha: 123456)
node scripts/setPasswords.js

# 2. Inspeção somente leitura da integridade do seed (Passo 1 da Parte 8B)
node scripts/inspect.js

# 3. Execução dos motores de compliance/alertas e comparação com gabaritos (Passos 3 e 4)
node scripts/verify.js
```

---

## 4. Como Executar a Aplicação

### 4.1. Backend (Node.js Express)

1. Entre na pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo `.env` baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Preencha `GEMINI_API_KEY`, configurações do SQL Server (`DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) e `JWT_SECRET`.*
4. Inicie o servidor:
   ```bash
   npm start
   # O backend estará disponível em http://localhost:3001
   ```

---

### 4.2. Frontend (React + TypeScript + Vite + Tailwind CSS)

1. Entre na pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo `.env` baseado no `.env.example`:
   ```bash
   cp .env.example .env
   # VITE_API_URL=http://localhost:3001
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   # O frontend estará disponível em http://localhost:5173
   ```

---

### 4.3. Microserviço Preditivo (Python FastAPI - Fase B Opcional)

> **Nota:** O microserviço em Python opera de maneira desacoplada. Caso esteja desligado, o backend Node.js e o frontend gerenciam a indisponibilidade (503) de forma graciosa sem quebrar as demais funcionalidades do dashboard analítico.

```bash
cd ml
python -m venv venv
venv\Scripts\activate # Windows (ou source venv/bin/activate no Linux/macOS)
pip install fastapi uvicorn scikit-learn
uvicorn main:app --port 8000 --reload
```

---

## 5. Módulos da Plataforma

### 5.1. Chatbot do Colaborador (`/chat`)
- Autoatendimento conversacional com IA (Google Gemini).
- Function calling para consulta de holerite, itens de proventos/descontos e saldo de férias.
- RAG integrado: responde dúvidas sobre políticas internas e benefícios corporativos citando fontes oficiais com selo de distinção ("Política interna" vs "Fonte oficial").

### 5.2. Admissão Digital Universal (`/onboarding`)
- Upload de ficha cadastral em PDF (com OCR por IA em caso de documento escaneado).
- Extração estruturada de dados com Gemini e validação contra regras da CLT.
- Revisão assistida pelo RH com destaque de divergências e aprovação em lote.

### 5.3. Inteligência Preditiva (`/analytics`)
- Painel executivo com métricas consolidadas (headcount, turnover, absenteísmo, horas extras).
- Detecção automatizada de hotspots e motor de regras para emissão de alertas de risco (`ABS_OT_UP`, `OT_CHRONIC`, `ABS_LEADS_TURNOVER`, `TRIPLE_RISK`).
- Resumos textuais acessíveis para leitores de tela e gráficos com série histórica de 24 meses.

### 5.4. Compliance Inteligente & eSocial (`/compliance`)
- Catálogo de regras da legislação trabalhista e regras de validação cadastral.
- Checklist pré-eSocial com simulação de consistência para eventos S-2200, S-2230 e S-2299.
- Trilha imutável de auditoria (`ComplianceAuditLog`).

### 5.5. Base de Conhecimento & Assistente Trabalhista (`/knowledge` e `/assistant`)
- Repositório centralizado de CLT, Manuais do eSocial, CCTs e Políticas Internas.
- Pipeline de ingestão: fatiamento (chunking) inteligente, plano B com OCR por IA para PDFs escaneados e invalidação dinâmica de cache RAG (sem necessidade de reiniciar o backend).
- Editor de Políticas corporativas em Markdown com sugestão de estrutura em FAQ por IA e verificação LGPD de dados pessoais (CPF, e-mail e telefone).
- Painéis interativos: "Ver trechos" (inspeção dos chunks indexados) e "Testar pergunta" na IA com visualização de scores e citações.

### 5.6. Acessibilidade & Inclusão Digital (VLibras)
- Integração nativa com o **VLibras** (Tradutor 3D de Língua Brasileira de Sinais oficial do governo federal).
- Carregamento tardio assíncrono com falha silenciosa para máxima resiliência.
- Marcação semântica com foco acessível e resumos textuais complementares.

---

## 6. Usuários de Demonstração (Demo)

| Perfil | E-mail | Senha | Módulos com Acesso |
| :--- | :--- | :--- | :--- |
| **Colaborador** | `ana.souza@exemplo.com` | `123456` | Assistente Virtual RH (`/chat`), Meu Perfil (`/me`) |
| **Colaborador** | `bruno.lima@exemplo.com` | `123456` | Assistente Virtual RH (`/chat`), Meu Perfil (`/me`) |
| **RH** | `roberta.rh@exemplo.com` | `123456` | Todos os módulos operacionais de RH (`/onboarding`, `/analytics`, `/compliance`, `/knowledge`, `/knowledge/policies/new`, `/assistant`, `/admin/users`) |
| **RH (Alternativo)** | `rh@exemplo.com` | `Senha@123` | Todos os módulos operacionais de RH |
| **Gestor** | `carlos.gestor@exemplo.com` | `123456` | Inteligência Preditiva (`/analytics`), Compliance em modo somente leitura (`/compliance`), Base de Conhecimento (`/knowledge`) |
| **Gestor (Alternativo)**| `gestor@exemplo.com` | `Senha@123` | Inteligência Preditiva (`/analytics`), Compliance em modo somente leitura (`/compliance`) |

---

## 7. Boas Práticas e Segurança

- **Segurança de Segredos:** Chaves de API, senhas de banco e segredos JWT residem exclusivamente nas variáveis de ambiente do backend.
- **LGPD:** Mascaramento de CPF (`***.***.***-XX`) na apresentação e na trilha imutável de auditoria. Dados 100% fictícios.
- **Escopo RAG por Perfil:** O backend aplica o filtro de público (`Audience`) no momento da busca; colaboradores nunca recebem trechos de documentos de circulação restrita ao RH.
- **Autenticação:** JWT Bearer Token com política de primeiro acesso (`MustChangePassword`) e controle de acesso baseado em papéis (RBAC).
