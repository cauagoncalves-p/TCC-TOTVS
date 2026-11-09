// backend/scripts/setPasswords.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { poolPromise } = require('../src/config/db');

const USERS = [
  { name: 'Ana Souza', email: 'ana.souza@exemplo.com', role: 'colaborador' },
  { name: 'Bruno Lima', email: 'bruno.lima@exemplo.com', role: 'colaborador' },
  { name: 'Roberta RH', email: 'roberta.rh@exemplo.com', role: 'rh' },
  { name: 'Carlos Gestor', email: 'carlos.gestor@exemplo.com', role: 'gestor' }
];

(async () => {
  try {
    const pool = await poolPromise;
    const hashed = await bcrypt.hash('123456', 10);

    for (const u of USERS) {
      const check = await pool.request()
        .input('email', u.email)
        .query('SELECT id FROM users WHERE email = @email');

      if (check.recordset.length > 0) {
        await pool.request()
          .input('email', u.email)
          .input('pwd', hashed)
          .input('role', u.role)
          .query('UPDATE users SET password_hash = @pwd, role = @role WHERE email = @email');
        console.log(`Usuário atualizado: ${u.email} (role: ${u.role}) com senha '123456'`);
      } else {
        await pool.request()
          .input('name', u.name)
          .input('email', u.email)
          .input('pwd', hashed)
          .input('role', u.role)
          .query('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (@name, @email, @pwd, @role, GETDATE())');
        console.log(`Usuário criado: ${u.email} (role: ${u.role}) com senha '123456'`);
      }
    }

    console.log('Operação de senhas e usuários concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao atualizar senhas:', err);
    process.exit(1);
  }
})();
