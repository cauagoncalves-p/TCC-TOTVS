// backend/scripts/setPasswords.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const bcrypt = require('bcryptjs');
const { poolPromise } = require('../src/config/db');

const USERS = [
  { email: 'ana.souza@exemplo.com', role: 'colaborador' },
  { email: 'bruno.lima@exemplo.com', role: 'colaborador' },
  { email: 'roberta.rh@exemplo.com', role: 'rh' },
  { email: 'carlos.gestor@exemplo.com', role: 'gestor' }
];

(async () => {
  try {
    const pool = await poolPromise;
    const hashed = await bcrypt.hash('123456', 10);

    for (const u of USERS) {
      const check = await pool.request()
        .input('email', u.email)
        .query('SELECT Id FROM dbo.Users WHERE LOWER(Email) = LOWER(@email)');

      if (check.recordset.length > 0) {
        await pool.request()
          .input('email', u.email)
          .input('pwd', hashed)
          .input('role', u.role)
          .query(`
            UPDATE dbo.Users 
            SET PasswordHash = @pwd, 
                Role = @role, 
                IsActive = 1, 
                MustChangePassword = 0 
            WHERE LOWER(Email) = LOWER(@email)
          `);
        console.log(`Usuário atualizado: ${u.email} (role: ${u.role}) com senha '123456'`);
      } else {
        await pool.request()
          .input('email', u.email)
          .input('pwd', hashed)
          .input('role', u.role)
          .query(`
            INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive, MustChangePassword, CreatedAt) 
            VALUES (@email, @pwd, @role, 1, 0, SYSUTCDATETIME())
          `);
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
