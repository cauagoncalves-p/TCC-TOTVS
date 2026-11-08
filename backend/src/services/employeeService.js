// backend/src/services/employeeService.js
const employeeRepository = require('../repositories/employeeRepository');

async function getProfile(userId) {
  return await employeeRepository.getByUserId(userId);
}

module.exports = { getProfile };
