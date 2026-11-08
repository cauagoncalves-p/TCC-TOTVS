// backend/src/repositories/payslipRepository.js
const { poolPromise } = require('../config/db');

async function getByCompetence(employeeId, competence) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('employeeId', employeeId)
    .input('competence', competence)
    .query('SELECT Id, EmployeeId, Competence, GrossAmount, TotalDeductions, NetAmount FROM Payslips WHERE EmployeeId = @employeeId AND Competence = @competence');
  return result.recordset[0];
}

async function getItemsByCompetence(payslipId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('payslipId', payslipId)
    .query('SELECT Code, Description, Kind, Amount FROM PayslipItems WHERE PayslipId = @payslipId');
  return result.recordset;
}

module.exports = { getByCompetence, getItemsByCompetence };
