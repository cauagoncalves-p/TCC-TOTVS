// backend/src/services/vacationService.js
const vacationRepository = require('../repositories/vacationRepository');
const employeeRepository = require('../repositories/employeeRepository');

async function getVacationBalance(userId) {
  const employee = await employeeRepository.getByUserId(userId);
  if (!employee) {
    throw new Error('Colaborador não encontrado');
  }
  return await vacationRepository.getByEmployeeId(employee.Id);
}

module.exports = { getVacationBalance };
