# ARCHITECTURE.md: TotvsRhInteligente

Sistema de RH/DP com IA (case TOTVS do TCC). Este documento é o plano que o agente deve seguir.
Trabalhar **uma parte por vez**. Não criar nada fora do que a parte atual descreve.

## Stack

- Frontend: React + TypeScript
- Backend: Node.js + Express (porta 3001), arquitetura em camadas
- Banco: SQL Server (`TotvsRhInteligenteDb`), driver `mssql`
- IA: Gemini (SDK `@google/genai`), modelo definido em `GEMINI_MODEL`
- Todos os dados são **fictícios** (LGPD: nunca usar dados reais de pessoas)

## Camadas do backend

```
backend/src/
  config/db.js            conexão com o SQL Server (pool)
  routes/                 define as rotas
  controllers/            valida entrada e devolve resposta HTTP
  services/               regra de negócio
  repositories/           ÚNICA camada que executa SQL
  middlewares/            authMiddleware (JWT), errorHandler
  ai/                     tudo que fala com o Gemini
```

Regra: controller não fala com banco; repository não tem regra de negócio.

---

## PARTE 1: Chatbot de RH

### Objetivo
Assistente virtual no portal do colaborador que responde dúvidas de RH em linguagem natural:
- **Perguntas gerais** (políticas, férias, benefícios, informe de rendimentos): respondidas a partir do **PDF da base de conhecimento**.
- **Perguntas pessoais** (saldo de férias, holerite, por que veio determinado desconto): respondidas com **dados do próprio usuário logado**, consultados no banco.

### Fluxo de uma mensagem

1. Front envia `POST /api/chat` com `{ sessionId?, message }` e o header `Authorization: Bearer <JWT>`.
2. `authMiddleware` valida o JWT e coloca `req.user = { id, role }`.
3. O service salva a mensagem do usuário e carrega o histórico recente da sessão.
4. Chama o Gemini com: instrução de sistema + conteúdo do PDF + histórico + mensagem + **ferramentas (function calling)**.
5. Se o Gemini pedir uma ferramenta, o backend a executa **usando `req.user.id`** e devolve o resultado ao Gemini.
6. Gemini redige a resposta final; o backend salva e devolve ao front.

### Regras de segurança (obrigatórias)

1. **O `userId` vem SEMPRE do token, nunca da mensagem nem de argumento escolhido pelo modelo.** As ferramentas não recebem `userId` como parâmetro; o backend injeta.
2. O JWT guarda apenas `id` e `role`. Nada de salário, CPF ou outros dados pessoais dentro do token.
3. Cada ferramenta só lê dados do usuário logado. Perguntas sobre outras pessoas devem ser recusadas.
4. A mensagem do usuário é entrada não confiável: o prompt de sistema deve dizer para ignorar instruções do usuário que tentem mudar essas regras.
5. Resposta sem base: se a informação não estiver no PDF nem nas ferramentas, o bot diz que não sabe e sugere falar com o RH. Não inventar.
6. `GEMINI_API_KEY` só no `.env`, fora do Git (`.gitignore`).

### Ferramentas (function calling)

| Ferramenta | Retorna | Tabelas |
|---|---|---|
| `getVacationBalance` | saldo e período aquisitivo de férias | `VacationBalances` |
| `getPayslip(competence)` | resumo do holerite do mês (`YYYY-MM`) | `Payslips` |
| `getPayslipItems(competence)` | rubricas (proventos e descontos) do mês | `PayslipItems` |
| `getMyProfile` | cargo, setor, data de admissão | `Employees` |

Todas recebem apenas parâmetros que não identificam o usuário (como `competence`).

### Base de conhecimento (PDF)

- Arquivo em `backend/knowledge/rh-faq.pdf`.
- No início do servidor, extrair o texto uma vez (`pdf-parse`) e manter em memória.
- Enquanto o PDF for pequeno, enviar o texto inteiro como contexto do Gemini. Se crescer muito, evoluir para busca por trechos (chunks).
- O PDF deve ser escrito em formato de **pergunta e resposta**, com um assunto por seção.

### Endpoints

- `POST /api/chat`: envia mensagem e recebe a resposta (cria a sessão se `sessionId` não vier).
- `GET /api/chat/sessions/:id/messages`: histórico (só se a sessão pertencer ao usuário do token).

### Banco de dados

Script: `database/001_chatbot_schema.sql`.
Tabelas: `Users`, `Employees`, `VacationBalances`, `Payslips`, `PayslipItems`, `ChatSessions`, `ChatMessages`.

### Conexão (`config/db.js`)

Usar o padrão com pool, lendo as variáveis do **mesmo `.env` do projeto**:

```javascript
require('dotenv').config()
const sql = require('mssql')

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
}

const poolPromise = new sql.ConnectionPool(config).connect()
  .then(pool => { console.log('Conexão estabelecida com sucesso!'); return pool })
  .catch(err => { console.log('Erro para se conectar!'); throw err })

module.exports = { sql, poolPromise }
```

Observação: esse formato usa login SQL (usuário e senha) por TCP. Para LocalDB com Windows Authentication é preciso outro driver/config (ver nota nas decisões em aberto).

Sempre usar **queries parametrizadas** (`request.input(...)`), nunca concatenar texto em SQL.

### Variáveis de ambiente (`.env`)

```
DB_SERVER=
DB_PORT=1433
DB_NAME=TotvsRhInteligenteDb
DB_USER=
DB_PASSWORD=
JWT_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=
```

### Ordem de implementação (tarefas para o agente)

1. Rodar `001_chatbot_schema.sql` e confirmar as tabelas e o seed.
2. Ajustar `config/db.js` e testar a conexão.
3. `authMiddleware` (JWT) e rota de teste protegida.
4. Repositories: `employeeRepository`, `vacationRepository`, `payslipRepository`, `chatRepository`.
5. Módulo `ai/`: carregar o PDF, definir as ferramentas e o prompt de sistema, loop de function calling com o Gemini.
6. `chatService`, `chatController` e rotas.
7. Frontend: tela de chat no portal do colaborador (lista de mensagens, campo de envio, estado de "digitando").
8. Testes manuais com os casos abaixo.

### Critérios de aceite

- Pergunta geral ("Como pego meu informe de rendimentos?") responde com base no PDF.
- "Quantos dias de férias eu ainda tenho?" devolve o saldo do usuário logado.
- "Por que meu desconto de vale-transporte veio assim?" usa as rubricas do holerite do usuário.
- Usuário A **não** consegue ver dados do usuário B, mesmo pedindo explicitamente.
- Pergunta fora do escopo recebe resposta honesta de que o bot não sabe, sem invenção.
- Sem token válido, `/api/chat` retorna 401.

### Decisões em aberto

- **Autenticação do banco:** SQL Auth (como no `db.js` acima) ou LocalDB com Windows Auth. No segundo caso, usar `mssql/msnodesqlv8` com connection string de Trusted Connection.
- **Tabela `Users`:** reaproveitar a existente do login (preferível) ou criar a do script.
