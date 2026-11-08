// backend/src/repositories/vacationRepository.js
const { poolPromise } = require('../config/db');

async function getByEmployeeId(employeeId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('employeeId', employeeId)
    .query('SELECT PeriodStart, PeriodEnd, DaysEntitled, DaysTaken, DaysRemaining FROM VacationBalances WHERE EmployeeId = @employeeId');
  return result.recordset[0];
}

module.exports = { getByEmployeeId };
