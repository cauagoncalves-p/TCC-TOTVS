const authService = require('../src/services/authService');
const employeeService = require('../src/services/employeeService');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
  try {
    console.log('--- Testando Login de ana.souza@exemplo.com ---');
    const token = await authService.login('ana.souza@exemplo.com', '123456');
    console.log('Login bem-sucedido! Token gerado:', token.substring(0, 30) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);

    console.log('--- Testando getProfile com userId =', decoded.id, '---');
    const profile = await employeeService.getProfile(decoded.id);
    console.log('Perfil encontrado no banco:', profile);

    console.log('\n>>> TODOS OS TESTES PASSARAM COM SUCESSO! <<<');
    process.exit(0);
  } catch (err) {
    console.error('Falha no teste:', err);
    process.exit(1);
  }
}

test();
