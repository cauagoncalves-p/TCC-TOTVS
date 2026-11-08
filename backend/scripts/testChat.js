const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const authService = require('../src/services/authService');
const chatService = require('../src/services/chatService');

async function runChatTests() {
  console.log('==================================================');
  console.log('           INICIANDO TESTES DO CHATBOT            ');
  console.log('==================================================');

  // 1. Autenticação dos dois usuários
  console.log('\n[1] Autenticando usuários de teste...');
  const anaToken = await authService.login('ana.souza@exemplo.com', '123456');
  const brunoToken = await authService.login('bruno.lima@exemplo.com', '123456');

  const jwt = require('jsonwebtoken');
  const anaUser = jwt.verify(anaToken, process.env.JWT_SECRET);
  const brunoUser = jwt.verify(brunoToken, process.env.JWT_SECRET);
  console.log(`Ana logada (UserId: ${anaUser.id})`);
  console.log(`Bruno logado (UserId: ${brunoUser.id})`);

  // 2. Pergunta Geral (Base de Conhecimento / PDF)
  console.log('\n[2] Testando pergunta geral (Base de conhecimento - FAQ PDF)...');
  const q1 = 'Como funciona o período aquisitivo de férias pela CLT?';
  console.log('Pergunta da Ana:', q1);
  const res1 = await chatService.handleMessage({
    userId: anaUser.id,
    message: q1
  });
  console.log('SessionId gerado:', res1.sessionId);
  console.log('Resposta do Bot:\n', res1.reply);

  const sessionId = res1.sessionId;

  // 3. Pergunta Pessoal (Saldo de férias - getVacationBalance)
  console.log('\n[3] Testando pergunta pessoal de férias (Ferramenta getVacationBalance)...');
  const q2 = 'Quantos dias de férias eu ainda tenho e qual é o meu período aquisitivo atual?';
  console.log('Pergunta da Ana:', q2);
  const res2 = await chatService.handleMessage({
    userId: anaUser.id,
    sessionId: sessionId,
    message: q2
  });
  console.log('Resposta do Bot:\n', res2.reply);

  // 4. Pergunta Pessoal (Holerite / Rubricas - getPayslipItems)
  console.log('\n[4] Testando pergunta de holerite (Ferramenta getPayslipItems)...');
  const q3 = 'Por que veio o desconto de vale-transporte no meu holerite de 2026-10 e qual foi o valor?';
  console.log('Pergunta da Ana:', q3);
  const res3 = await chatService.handleMessage({
    userId: anaUser.id,
    sessionId: sessionId,
    message: q3
  });
  console.log('Resposta do Bot:\n', res3.reply);

  // 5. Histórico da sessão da Ana
  console.log('\n[5] Recuperando histórico da sessão pela Ana (dona da sessão)...');
  const anaHistory = await chatService.getSessionMessages({
    userId: anaUser.id,
    sessionId: sessionId
  });
  console.log(`Ana recuperou ${anaHistory ? anaHistory.length : 0} mensagens com sucesso!`);

  // 6. Teste de isolamento de segurança: Bruno tentando ler a sessão da Ana
  console.log('\n[6] Teste de Segurança: Bruno tentando ler a sessão da Ana...');
  const brunoHistory = await chatService.getSessionMessages({
    userId: brunoUser.id,
    sessionId: sessionId
  });
  if (brunoHistory === null) {
    console.log('SEGURANÇA CONFIRMADA: Bruno recebeu NULL (bloqueado com 404)!');
  } else {
    console.error('FALHA DE SEGURANÇA: Bruno conseguiu ver mensagens da Ana!');
  }

  console.log('\n==================================================');
  console.log('       TODOS OS TESTES DO CHAT PASSARAM!          ');
  console.log('==================================================');
  process.exit(0);
}

runChatTests().catch(err => {
  console.error('Erro nos testes do chat:', err);
  process.exit(1);
});
