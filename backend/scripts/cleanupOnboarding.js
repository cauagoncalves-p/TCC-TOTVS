// backend/scripts/cleanupOnboarding.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const { poolPromise } = require('../src/config/db');

async function cleanup() {
  const pool = await poolPromise;

  // Remove casos de onboarding anteriores
  await pool.request().query('DELETE FROM dbo.OnboardingCases');
  console.log('OnboardingCases limpo.');

  // Remove Carla se existir de testes anteriores
  const carlaRes = await pool.request()
    .query("SELECT id FROM dbo.users WHERE email = 'carla.oliveira@exemplo.com'");
  if (carlaRes.recordset.length > 0) {
    const carlaId = carlaRes.recordset[0].id;
    await pool.request().input('uid', carlaId)
      .query('DELETE FROM dbo.VacationBalances WHERE EmployeeId IN (SELECT Id FROM dbo.Employees WHERE UserId = @uid)');
    await pool.request().input('uid', carlaId)
      .query('DELETE FROM dbo.Employees WHERE UserId = @uid');
    await pool.request().input('uid', carlaId)
      .query('DELETE FROM dbo.users WHERE id = @uid');
    console.log('Carla removida do banco.');
  }

  // Reset da sequence para M0003
  try {
    await pool.request().query('ALTER SEQUENCE dbo.EmployeeRegistrationSeq RESTART WITH 3');
    console.log('Sequence reiniciada em 3.');
  } catch (e) {
    console.log('Nota sequence:', e.message);
  }

  console.log('Limpeza concluida!');
  process.exit(0);
}

cleanup().catch(e => { console.error(e); process.exit(1); });
