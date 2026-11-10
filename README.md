# TOTVS RH Inteligente

Plataforma inteligente de Recursos Humanos desenvolvida como solução corporativa integrando autoatendimento para colaboradores, admissão digital universal com inteligência artificial, analytics preditivo de indicadores de pessoas e auditoria contínua de compliance trabalhista/eSocial.

---

## 1. Pré-Requisitos

- **Node.js**: v18.0.0 ou superior (recomendado v20+)
- **NPM**: v9.0.0 ou superior
- **SQL Server**: 2019 ou superior (Express, Developer ou Standard)
- **Python**: 3.10 ou superior *(necessário apenas para o microserviço preditivo ML da Fase B)*
- **Chave de API do Google Gemini**: Obtida no Google AI Studio (modelo recomendado: `gemini-3-flash-preview`)

---

## 2. Banco de Dados: Ordem dos Scripts SQL

Os scripts devem ser executados em ordem sequencial no banco de dados SQL Server (`EduTrackDB` ou `TotvsRhInteligenteDb`):

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

---

## 3. Seeds e Carga Inicial de Dados

Com o banco de dados configurado e os scripts aplicados, execute os seeds a partir da pasta `backend`:

```bash
cd backend

# 1. Definir/atualizar senhas dos usuários com hash bcrypt seguro
node scripts/setPasswords.js

# 2. Popular histórico analítico de 24 meses e departamentos (Inteligência Preditiva)
node scripts/seedAnalytics.js

# 3. Popular regras trabalhistas, defeitos plantados para auditoria e eventos eSocial
node scripts/seedCompliance.js
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
   *Preencha a chave `GEMINI_API_KEY`, dados do SQL Server e `JWT_SECRET`.*
4. Inicie o servidor:
   ```bash
   npm start
   # O backend estará disponível em http://localhost:3001
   ```

---

### 4.2. Frontend (React + Vite + Tailwind CSS)

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

### 4.3. Microserviço Preditivo (Python FastAPI - Fase B)

> **Nota:** O microserviço em Python opera de maneira desacoplada. Caso esteja desligado, o backend Node.js e o frontend gerenciam a indisponibilidade (503) de forma graciosa sem quebrar as demais funcionalidades do dashboard analítico.

```bash
cd ml
python -m venv venv
venv\Scripts\activate # Windows (ou source venv/bin/activate no Linux/macOS)
pip install fastapi uvicorn scikit-learn
uvicorn main:app --port 8000 --reload
```

---

## 5. Usuários de Teste

| Perfil | E-mail | Senha | Módulos com Acesso |
| :--- | :--- | :--- | :--- |
| **Colaborador** | `ana.souza@exemplo.com` | `123456` | Assistente Virtual RH (`/chat`), Meu Perfil (`/me`) |
| **Colaborador** | `bruno.lima@exemplo.com` | `123456` | Assistente Virtual RH (`/chat`), Meu Perfil (`/me`) |
| **RH** | `roberta.rh@exemplo.com` | `123456` | Onboarding com IA (`/onboarding`), Inteligência Preditiva (`/analytics`), Compliance Inteligente (`/compliance`), Base de Conhecimento (`/knowledge`), Assistente Trabalhista RAG (`/assistant`) |
| **RH (Alternativo)** | `rh@exemplo.com` | `Senha@123` | Todos os módulos operacionais de RH |
| **Gestor** | `carlos.gestor@exemplo.com` | `123456` | Inteligência Preditiva (`/analytics`), Compliance em modo somente leitura (`/compliance`) |
| **Gestor (Alternativo)**| `gestor@exemplo.com` | `Senha@123` | Inteligência Preditiva (`/analytics`), Compliance em modo somente leitura (`/compliance`) |

---

## 6. Boas Práticas e Segurança

- Chaves de API, senhas de banco e segredos JWT residem exclusivamente nas variáveis de ambiente do backend.
- O mascaramento de CPF (`***.***.***-XX`) é aplicado na apresentação e na trilha imutável de auditoria.
- Acesso controlado por perfil (RBAC) com validação estrita no servidor (JWT Bearer Token).
