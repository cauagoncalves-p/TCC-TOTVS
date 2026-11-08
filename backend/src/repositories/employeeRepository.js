// backend/src/repositories/employeeRepository.js
const { sql, poolPromise } = require('../config/db');

/**
 * Busca o colaborador pelo UserId do token
 * @param {number} userId
 * @returns {Promise<Object|undefined>}
 */
async function getByUserId(userId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('userId', userId)
    .query('SELECT Id, UserId, FullName, Registration, JobTitle, Department, HireDate, Status FROM Employees WHERE UserId = @userId');
  return result.recordset[0];
}

/**
 * Efetua a criação transacional de Usuário, Colaborador, Saldo de Férias e aprovação do Caso
 * @param {Object} params { caseId, reviewerUserId, candidateData, tempPasswordHash }
 * @returns {Promise<{userId: number, employeeId: number, registration: string}>}
 */
async function createFromOnboarding({ caseId, reviewerUserId, candidateData, tempPasswordHash }) {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    // 1. Gera próxima matrícula sequencial
    const seqReq = new sql.Request(transaction);
    const seqRes = await seqReq.query('SELECT NEXT VALUE FOR dbo.EmployeeRegistrationSeq AS NextSeq');
    const seqNum = seqRes.recordset[0].NextSeq;
    const registration = 'M' + String(seqNum).padStart(4, '0');

    // 2. Insere usuário em dbo.users
    const userReq = new sql.Request(transaction);
    const userRes = await userReq
      .input('name', candidateData.fullName)
      .input('email', candidateData.email.trim().toLowerCase())
      .input('pwd', tempPasswordHash)
      .input('role', 'colaborador')
      .query(`
        INSERT INTO dbo.users (name, email, password_hash, role, created_at)
        OUTPUT INSERTED.id
        VALUES (@name, @email, @pwd, @role, GETDATE())
      `);
    const newUserId = userRes.recordset[0].id;

    // 3. Insere o colaborador em dbo.Employees
    const rawCpf = candidateData.cpf ? String(candidateData.cpf).replace(/\D/g, '') : null;
    const rawZip = candidateData.zipCode ? String(candidateData.zipCode).replace(/\D/g, '') : null;
    const salary = candidateData.baseSalary !== undefined && candidateData.baseSalary !== null && candidateData.baseSalary !== ''
      ? Number(candidateData.baseSalary)
      : null;

    const empReq = new sql.Request(transaction);
    const empRes = await empReq
      .input('userId', newUserId)
      .input('fullName', candidateData.fullName.trim())
      .input('reg', registration)
      .input('jobTitle', candidateData.jobTitle.trim())
      .input('dept', candidateData.department.trim())
      .input('hireDate', candidateData.hireDate)
      .input('cpf', rawCpf)
      .input('rg', candidateData.rg || null)
      .input('birthDate', candidateData.birthDate || null)
      .input('phone', candidateData.phone || null)
      .input('personalEmail', candidateData.email.trim().toLowerCase())
      .input('zipCode', rawZip)
      .input('street', candidateData.street || null)
      .input('city', candidateData.city || null)
      .input('state', candidateData.state ? candidateData.state.trim().toUpperCase() : null)
      .input('baseSalary', salary)
      .query(`
        INSERT INTO dbo.Employees (
          UserId, FullName, Registration, JobTitle, Department, HireDate,
          Cpf, Rg, BirthDate, Phone, PersonalEmail, ZipCode, Street, City, State, BaseSalary, Status
        )
        OUTPUT INSERTED.Id
        VALUES (
          @userId, @fullName, @reg, @jobTitle, @dept, @hireDate,
          @cpf, @rg, @birthDate, @phone, @personalEmail, @zipCode, @street, @city, @state, @baseSalary, 'ativo'
        )
      `);
    const newEmployeeId = empRes.recordset[0].Id;

    // 4. Saldo inicial de férias
    const vacReq = new sql.Request(transaction);
    const hireObj = new Date(candidateData.hireDate + 'T00:00:00Z');
    const endObj = new Date(hireObj);
    endObj.setFullYear(endObj.getFullYear() + 1);
    endObj.setDate(endObj.getDate() - 1);
    const pStart = candidateData.hireDate;
    const pEnd = endObj.toISOString().split('T')[0];

    await vacReq
      .input('empId', newEmployeeId)
      .input('start', pStart)
      .input('end', pEnd)
      .query(`
        INSERT INTO dbo.VacationBalances (EmployeeId, PeriodStart, PeriodEnd, DaysEntitled, DaysTaken)
        VALUES (@empId, @start, @end, 30, 0)
      `);

    // 5. Atualiza o caso OnboardingCases
    const caseReq = new sql.Request(transaction);
    await caseReq
      .input('caseId', caseId)
      .input('reviewedBy', reviewerUserId)
      .input('empId', newEmployeeId)
      .query(`
        UPDATE dbo.OnboardingCases
        SET Status = 'aprovado',
            ReviewedBy = @reviewedBy,
            ReviewedAt = SYSUTCDATETIME(),
            EmployeeId = @empId
        WHERE Id = @caseId
      `);

    await transaction.commit();

    return {
      userId: newUserId,
      employeeId: newEmployeeId,
      registration
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  getByUserId,
  createFromOnboarding
};
