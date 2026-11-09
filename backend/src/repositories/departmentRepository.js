// backend/src/repositories/departmentRepository.js
const { poolPromise } = require('../config/db');

/**
 * Lista todos os departamentos ativos
 * @returns {Promise<Array<{Id: number, Name: string, IsActive: boolean}>>}
 */
async function listActive() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT Id, Name, IsActive
    FROM dbo.Departments
    WHERE IsActive = 1
    ORDER BY Name ASC
  `);
  return result.recordset;
}

/**
 * Busca departamento por ID
 * @param {number} id
 * @returns {Promise<Object|undefined>}
 */
async function getById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .query(`
      SELECT Id, Name, IsActive
      FROM dbo.Departments
      WHERE Id = @id
    `);
  return result.recordset[0];
}

module.exports = {
  listActive,
  getById
};
