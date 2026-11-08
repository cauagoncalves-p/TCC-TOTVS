// backend/scripts/testDb.js
// Script rápido para validar a conexão ao MySQL

require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT NOW() AS now');
    console.log('Conexão OK →', rows[0]);
    conn.release();
    process.exit(0);
  } catch (e) {
    console.error('Falha na conexão:', e);
    process.exit(1);
  }
})();