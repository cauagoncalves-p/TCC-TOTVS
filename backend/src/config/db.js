// backend/src/config/db.js
const path = require('path');
// Importante: override: true garante que o .env do projeto sobreponha variáveis residuais do Windows (como DB_USER do postgres)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
const sql = require('mssql');

const rawPassword = process.env.DB_PASSWORD || process.env.EDUTRACK_DB_PASSWORD || 'Caua#cidade';
const cleanPassword = rawPassword.replace(/^["']|["']$/g, '');

const config = {
  server: process.env.DB_SERVER || process.env.EDUTRACK_DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.EDUTRACK_DB_PORT, 10) || 1433,
  database: process.env.DB_NAME || process.env.EDUTRACK_DB_NAME || 'EduTrackDB',
  user: process.env.DB_USER || process.env.EDUTRACK_DB_USER || 'edutrack_api',
  password: cleanPassword,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log(`Conexão estabelecida com sucesso no banco [${config.database}] como [${config.user}]!`);
    return pool;
  })
  .catch(err => {
    console.error(`Erro ao conectar ao banco de dados [${config.database}] como [${config.user}]:`, err.message);
    throw err;
  });

module.exports = { sql, poolPromise };
