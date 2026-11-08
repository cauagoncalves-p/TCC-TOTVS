const { poolPromise } = require('../src/config/db');

(async () => {
  try {
    const pool = await poolPromise;

    // 1. Tables
    const tables = await pool.request().query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME"
    );
    console.log('=== TABLES ===');
    tables.recordset.forEach(r => console.log(' ', r.TABLE_NAME));

    // 2. Users table columns
    const cols = await pool.request().query(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' ORDER BY ORDINAL_POSITION"
    );
    console.log('\n=== users COLUMNS ===');
    cols.recordset.forEach(r => console.log(' ', r.COLUMN_NAME, r.DATA_TYPE));

    // 3. Existing users
    const users = await pool.request().query('SELECT id, name, email, role FROM users');
    console.log('\n=== users DATA ===');
    users.recordset.forEach(r => console.log(' ', r.id, r.name, r.email, r.role));

    // 4. Check OnboardingCases
    const obExists = await pool.request().query(
      "SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='OnboardingCases'"
    );
    console.log('\n=== OnboardingCases exists? ===', obExists.recordset.length > 0);

    // 5. Check Employees columns
    const empCols = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Employees' ORDER BY ORDINAL_POSITION"
    );
    console.log('\n=== Employees COLUMNS ===');
    empCols.recordset.forEach(r => console.log(' ', r.COLUMN_NAME));

    // 6. Check sequence
    const seqExists = await pool.request().query(
      "SELECT 1 AS ok FROM sys.sequences WHERE name='EmployeeRegistrationSeq'"
    );
    console.log('\n=== EmployeeRegistrationSeq exists? ===', seqExists.recordset.length > 0);

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
