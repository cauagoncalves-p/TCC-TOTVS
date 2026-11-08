// backend/src/services/payslipService.js
const payslipRepository = require('../repositories/payslipRepository');
const employeeRepository = require('../repositories/employeeRepository');

async function getPayslip(userId, competence) {
  const employee = await employeeRepository.getByUserId(userId);
  if (!employee) {
    throw new Error('Colaborador não encontrado');
  }
  const payslip = await payslipRepository.getByCompetence(employee.Id, competence);
  if (!payslip) {
    throw new Error(`Holerite não encontrado para a competência ${competence}`);
  }
  return payslip;
}

async function getPayslipItems(userId, competence) {
  const payslip = await getPayslip(userId, competence);
  const items = await payslipRepository.getItemsByCompetence(payslip.Id);
  return {
    summary: payslip,
    items
  };
}

module.exports = { getPayslip, getPayslipItems };
