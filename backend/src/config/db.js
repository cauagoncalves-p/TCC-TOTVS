// backend/src/config/db.js
const path = require('path');
// override: true garante que o .env do projeto sobreponha variáveis de ambiente do sistema
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
const sql = require('mssql');

const rawPassword = process.env.DB_PASSWORD || 'Caua#cidade';
const cleanPassword = rawPassword.replace(/^[\"']|[\"']$/g, '');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 1434,
  database: process.env.DB_NAME || 'TotvsRhInteligenteDb',
  user: process.env.DB_USER || 'totvs_api',
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

let poolInstance = null;
let connectingPromise = null;

async function getPool() {
  if (poolInstance && poolInstance.connected) {
    return poolInstance;
  }
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = new sql.ConnectionPool(config)
    .connect()
    .then(p => {
      console.log(`Conexão estabelecida com sucesso no banco [${config.database}] como [${config.user}]!`);
      poolInstance = p;
      connectingPromise = null;
      return p;
    })
    .catch(err => {
      console.error(`Erro ao conectar ao banco de dados [${config.database}] como [${config.user}]:`, err.message);
      connectingPromise = null;
      throw err;
    });

  return connectingPromise;
}

// Inicia tentativa de conexão sem derrubar o processo com unhandled rejection
getPool().catch(() => {});

// Objeto thenable compatível com "await poolPromise" em todos os repositories
const poolPromise = {
  then(onFulfilled, onRejected) {
    return getPool().then(onFulfilled, onRejected);
  },
  catch(onRejected) {
    return getPool().catch(onRejected);
  }
};

module.exports = { sql, poolPromise, getPool };
