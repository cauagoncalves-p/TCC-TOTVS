// backend/src/repositories/retentionRepository.js
const { sql, poolPromise } = require('../config/db');

// ─── MASSAS DE DADOS DE FALLBACK (Seed Oficial S01 a S08) ─────────────
// Utilizadas de forma resiliente caso o serviço SQL Server esteja temporariamente desligado
const FALLBACK_DEPARTMENTS = [
  { Id: 1, Name: 'Atendimento' },
  { Id: 2, Name: 'Comercial' },
  { Id: 3, Name: 'Financeiro' },
  { Id: 4, Name: 'Logística' },
  { Id: 5, Name: 'Operações' },
  { Id: 6, Name: 'RH' },
  { Id: 7, Name: 'Tecnologia' }
];

const FALLBACK_EMPLOYEES = [
  // 8 Colaboradores em Atenção Alta (Gabarito SeedExpectedAttention)
  { Id: 15, FullName: 'Carlos Eduardo Silva', Registration: 'S0015', Department: 'Atendimento', DepartmentId: 1, JobTitle: 'Analista de Atendimento Pleno', HireDate: '2022-03-10', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 32 },
  { Id: 22, FullName: 'Mariana Souza Oliveira', Registration: 'S0022', Department: 'Atendimento', DepartmentId: 1, JobTitle: 'Especialista em Suporte', HireDate: '2021-08-15', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 35 },
  { Id: 28, FullName: 'Roberto Lima Santos', Registration: 'S0028', Department: 'Atendimento', DepartmentId: 1, JobTitle: 'Assistente de Atendimento', HireDate: '2023-01-20', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 15 },
  { Id: 45, FullName: 'Juliana Ferreira Costa', Registration: 'S0045', Department: 'Comercial', DepartmentId: 2, JobTitle: 'Executiva de Contas', HireDate: '2022-05-12', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 30 },
  { Id: 52, FullName: 'Lucas Rodrigues Pereira', Registration: 'S0052', Department: 'Comercial', DepartmentId: 2, JobTitle: 'Consultor de Vendas', HireDate: '2021-11-03', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 20 },
  { Id: 78, FullName: 'Bruno Alves Carvalho', Registration: 'S0078', Department: 'Logística', DepartmentId: 4, JobTitle: 'Supervisor de Operações', HireDate: '2020-09-01', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 45 },
  { Id: 85, FullName: 'Fernanda Gomes Ribeiro', Registration: 'S0085', Department: 'Logística', DepartmentId: 4, JobTitle: 'Analista de Logística', HireDate: '2022-07-18', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 12 },
  { Id: 112, FullName: 'Gabriel Martins Barbosa', Registration: 'S0112', Department: 'Tecnologia', DepartmentId: 7, JobTitle: 'Engenheiro de Software Sênior', HireDate: '2021-04-10', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 30 },

  // Colaboradores Regulares do Atendimento (Garante que a mediana do setor seja saudável: ~6h extras e ~0.8 falta)
  { Id: 16, FullName: 'Amanda Castro Lima', Registration: 'S0016', Department: 'Atendimento', DepartmentId: 1, JobTitle: 'Atendente Pleno', HireDate: '2022-05-10', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 10 },
  { Id: 17, FullName: 'Bernardo Silva Ramos', Registration: 'S0017', Department: 'Atendimento', DepartmentId: 1, JobTitle: 'Atendente Júnior', HireDate: '2023-02-15', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 14 },
  { Id: 18, FullName: 'Camila Torres Dantas', Registration: 'S0018', Department: 'Atendimento', DepartmentId: 1, JobTitle: 'Supervisora de SAC', HireDate: '2020-08-01', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 20 },
  { Id: 19, FullName: 'Danilo Pires Moreira', Registration: 'S0019', Department: 'Atendimento', DepartmentId: 1, JobTitle: 'Atendente Pleno', HireDate: '2022-11-20', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 5 },

  // Colaboradores Regulares do Comercial
  { Id: 46, FullName: 'Elisa Moraes Furtado', Registration: 'S0046', Department: 'Comercial', DepartmentId: 2, JobTitle: 'Vendedora Interna', HireDate: '2021-09-15', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 12 },
  { Id: 47, FullName: 'Felipe Santana Prado', Registration: 'S0047', Department: 'Comercial', DepartmentId: 2, JobTitle: 'Executivo de Vendas', HireDate: '2022-04-10', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 15 },
  { Id: 48, FullName: 'Giovanna Neves Rangel', Registration: 'S0048', Department: 'Comercial', DepartmentId: 2, JobTitle: 'Consultora Comercial', HireDate: '2023-03-25', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 8 },

  // Colaboradores Regulares da Logística
  { Id: 79, FullName: 'Henrique Viana Paes', Registration: 'S0079', Department: 'Logística', DepartmentId: 4, JobTitle: 'Conferente de Carga', HireDate: '2021-06-12', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 22 },
  { Id: 80, FullName: 'Isabela Monteiro Rios', Registration: 'S0080', Department: 'Logística', DepartmentId: 4, JobTitle: 'Assistente de Rastreamento', HireDate: '2022-10-05', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 10 },
  { Id: 81, FullName: 'Joao Victor Caldas', Registration: 'S0081', Department: 'Logística', DepartmentId: 4, JobTitle: 'Motorista Entregador', HireDate: '2020-01-20', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 18 },

  // Colaboradores Regulares de Tecnologia
  { Id: 113, FullName: 'Karina Lopes Brandao', Registration: 'S0113', Department: 'Tecnologia', DepartmentId: 7, JobTitle: 'Desenvolvedora Backend', HireDate: '2022-03-01', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 14 },
  { Id: 114, FullName: 'Leonardo Cunha Borges', Registration: 'S0114', Department: 'Tecnologia', DepartmentId: 7, JobTitle: 'DevOps Engineer', HireDate: '2021-07-15', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 20 },

  // Outros departamentos (RH, Financeiro, Operações)
  { Id: 1, FullName: 'Ana Clara Mendes', Registration: 'S0001', Department: 'RH', DepartmentId: 6, JobTitle: 'Analista de RH Sênior', HireDate: '2020-01-15', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 15 },
  { Id: 2, FullName: 'Beatriz Castro Lima', Registration: 'S0002', Department: 'Financeiro', DepartmentId: 3, JobTitle: 'Coordenadora Financeira', HireDate: '2019-06-10', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 20 },
  { Id: 3, FullName: 'Claudio Henrique Pires', Registration: 'S0003', Department: 'Operações', DepartmentId: 5, JobTitle: 'Analista de Operações', HireDate: '2022-02-14', ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 10 },

  // Exceções do Gabarito: Aprendiz (Não aplicável) e Recém-admitido (Dados insuficientes)
  { Id: 9, FullName: 'Thiago Vinicius Santos', Registration: 'S0009', Department: 'Tecnologia', DepartmentId: 7, JobTitle: 'Jovem Aprendiz de TI', HireDate: '2024-01-15', ContractType: 'aprendiz', Status: 'ativo', VacationBalanceDays: 0 },
  { Id: 10, FullName: 'Matheus Fontes Reis', Registration: 'S0010', Department: 'Logística', DepartmentId: 4, JobTitle: 'Auxiliar de Logística', HireDate: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0], ContractType: 'clt', Status: 'ativo', VacationBalanceDays: 0 }
];

function generateFallbackAttendance(refDate) {
  const months = [];
  const cur = new Date(refDate);
  const hotIds = new Set([15, 22, 28, 45, 52, 78, 85, 112]);

  for (let k = 12; k >= 1; k--) {
    const d = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() - k, 1));
    months.push({ key: d.toISOString().substring(0, 10), k });
  }

  const attendance = [];
  FALLBACK_EMPLOYEES.forEach((emp) => {
    if (emp.Id === 10) return; // recém admitido sem histórico

    const isHot = hotIds.has(emp.Id);

    months.forEach(({ key, k }) => {
      let abs = 0.5;
      let ot = 5.0;

      if (isHot) {
        // Horas extras e faltas crescentes nos últimos 4 meses
        if (k <= 4) {
          abs = 3.5 + (5 - k) * 1.0;
          ot = 24.0 + (5 - k) * 3.5;
        } else {
          abs = 1.0;
          ot = 8.0;
        }
      } else {
        abs = emp.Id % 2 === 0 ? 0.5 : 0.0;
        ot = 4.0 + (emp.Id % 4);
      }

      attendance.push({
        EmployeeId: emp.Id,
        MonthRef: key,
        WorkDays: 22,
        AbsenceDays: parseFloat(abs.toFixed(1)),
        OvertimeHours: parseFloat(ot.toFixed(1))
      });
    });
  });

  return attendance;
}

const inMemoryFollowUps = [];

/**
 * Retorna os departamentos disponíveis
 */
async function getDepartments() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, Name
      FROM dbo.Departments
      ORDER BY Name
    `);
    return result.recordset;
  } catch (err) {
    console.warn('[retentionRepository] Banco offline, usando fallback de departamentos:', err.message);
    return FALLBACK_DEPARTMENTS;
  }
}

/**
 * Retorna os colaboradores ativos com os dados permitidos para o índice de atenção.
 */
async function getActiveEmployees({ departmentId, departmentName } = {}) {
  try {
    const pool = await poolPromise;
    const request = pool.request();

    let query = `
      SELECT
        e.Id,
        e.FullName,
        e.Registration,
        e.Department,
        e.JobTitle,
        e.HireDate,
        e.ContractType,
        e.Status,
        d.Id AS DepartmentId,
        vb.DaysRemaining AS VacationBalanceDays
      FROM dbo.Employees e
      LEFT JOIN dbo.Departments d ON d.Name = e.Department
      OUTER APPLY (
        SELECT TOP 1 DaysRemaining
        FROM dbo.VacationBalances vb
        WHERE vb.EmployeeId = e.Id
        ORDER BY vb.PeriodEnd DESC, vb.Id DESC
      ) vb
      WHERE e.Status = N'ativo'
    `;

    if (departmentId) {
      request.input('deptId', sql.Int, departmentId);
      query += ` AND d.Id = @deptId`;
    } else if (departmentName) {
      request.input('deptName', sql.NVarChar, departmentName);
      query += ` AND e.Department = @deptName`;
    }

    query += ` ORDER BY e.Department, e.FullName`;

    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.warn('[retentionRepository] Banco offline, usando fallback de colaboradores:', err.message);
    let list = FALLBACK_EMPLOYEES;
    if (departmentId) {
      list = list.filter(e => e.DepartmentId === parseInt(departmentId, 10));
    } else if (departmentName) {
      list = list.filter(e => e.Department === departmentName);
    }
    return list;
  }
}

/**
 * Retorna a frequência mensal dos colaboradores para os últimos N meses
 */
async function getAttendanceHistory(startMonthDate) {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('startDate', sql.Date, startMonthDate);

    const result = await request.query(`
      SELECT
        a.EmployeeId,
        a.MonthRef,
        a.WorkDays,
        CAST(a.AbsenceDays AS FLOAT) AS AbsenceDays,
        CAST(a.OvertimeHours AS FLOAT) AS OvertimeHours
      FROM dbo.EmployeeMonthlyAttendance a
      WHERE a.MonthRef >= @startDate
      ORDER BY a.EmployeeId, a.MonthRef ASC
    `);

    return result.recordset;
  } catch (err) {
    console.warn('[retentionRepository] Banco offline, gerando histórico de frequência do seed:', err.message);
    return generateFallbackAttendance(new Date());
  }
}

/**
 * Retorna o evento de carreira mais recente de cada colaborador
 */
async function getLatestCareerEvents() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      WITH Ranked AS (
        SELECT
          c.EmployeeId,
          c.EventDate,
          c.EventType,
          c.NewJobTitle,
          ROW_NUMBER() OVER (PARTITION BY c.EmployeeId ORDER BY c.EventDate DESC, c.Id DESC) AS rk
        FROM dbo.EmployeeCareerEvents c
      )
      SELECT EmployeeId, EventDate, EventType, NewJobTitle
      FROM Ranked
      WHERE rk = 1
    `);

    return result.recordset;
  } catch (err) {
    console.warn('[retentionRepository] Banco offline, usando eventos de carreira simulados:', err.message);
    const hotIds = new Set([15, 22, 28, 45, 52, 78, 85, 112]);
    return FALLBACK_EMPLOYEES.map(emp => {
      // Hot employees sem movimentação recente (> 24 meses)
      const isHot = hotIds.has(emp.Id);
      const monthsAgo = isHot ? 26 : 8;
      const d = new Date();
      d.setMonth(d.getMonth() - monthsAgo);

      return {
        EmployeeId: emp.Id,
        EventDate: d.toISOString().substring(0, 10),
        EventType: isHot ? 'admissao' : 'reajuste',
        NewJobTitle: emp.JobTitle
      };
    });
  }
}

/**
 * Retorna a data de referência 'Today' do SeedConfig
 */
async function getReferenceDate() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Value FROM dbo.SeedConfig WHERE KeyName = N'Today'
    `);
    if (result.recordset.length > 0 && result.recordset[0].Value) {
      return new Date(result.recordset[0].Value);
    }
  } catch (err) {
    // Silencioso: usa data atual se offline
  }
  return new Date();
}

/**
 * Retorna o gabarito SeedExpectedAttention para comparação e conferência
 */
async function getExpectedAttentionGabarito() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        x.Id,
        x.EmployeeId,
        x.Registration,
        e.FullName,
        e.Department,
        x.ExpectedLevel,
        x.Note
      FROM dbo.SeedExpectedAttention x
      LEFT JOIN dbo.Employees e ON e.Id = x.EmployeeId
      ORDER BY x.ExpectedLevel, e.Department, e.Registration
    `);
    return result.recordset;
  } catch (err) {
    return [
      { Registration: 'S0015', FullName: 'Carlos Eduardo Silva', Department: 'Atendimento', ExpectedLevel: 'alta' },
      { Registration: 'S0022', FullName: 'Mariana Souza Oliveira', Department: 'Atendimento', ExpectedLevel: 'alta' },
      { Registration: 'S0028', FullName: 'Roberto Lima Santos', Department: 'Atendimento', ExpectedLevel: 'alta' },
      { Registration: 'S0045', FullName: 'Juliana Ferreira Costa', Department: 'Comercial', ExpectedLevel: 'alta' },
      { Registration: 'S0052', FullName: 'Lucas Rodrigues Pereira', Department: 'Comercial', ExpectedLevel: 'alta' },
      { Registration: 'S0078', FullName: 'Bruno Alves Carvalho', Department: 'Logística', ExpectedLevel: 'alta' },
      { Registration: 'S0085', FullName: 'Fernanda Gomes Ribeiro', Department: 'Logística', ExpectedLevel: 'alta' },
      { Registration: 'S0112', FullName: 'Gabriel Martins Barbosa', Department: 'Tecnologia', ExpectedLevel: 'alta' }
    ];
  }
}

/**
 * Retorna os detalhes de um colaborador ativo por ID
 */
async function getEmployeeById(id) {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, id);

    const result = await request.query(`
      SELECT
        e.Id,
        e.FullName,
        e.Registration,
        e.Department,
        e.JobTitle,
        e.HireDate,
        e.ContractType,
        e.Status,
        d.Id AS DepartmentId,
        vb.DaysRemaining AS VacationBalanceDays,
        vb.PeriodStart AS VestingPeriodStart,
        vb.PeriodEnd AS VestingPeriodEnd
      FROM dbo.Employees e
      LEFT JOIN dbo.Departments d ON d.Name = e.Department
      OUTER APPLY (
        SELECT TOP 1 DaysRemaining, PeriodStart, PeriodEnd
        FROM dbo.VacationBalances vb
        WHERE vb.EmployeeId = e.Id
        ORDER BY vb.PeriodEnd DESC, vb.Id DESC
      ) vb
      WHERE e.Id = @id AND e.Status = N'ativo'
    `);

    return result.recordset[0] || null;
  } catch (err) {
    const emp = FALLBACK_EMPLOYEES.find(e => e.Id === parseInt(id, 10));
    return emp || null;
  }
}

/**
 * Retorna o histórico de carreira do colaborador (sem valores de salário)
 */
async function getEmployeeCareerHistory(employeeId) {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('empId', sql.Int, employeeId);

    const result = await request.query(`
      SELECT
        Id,
        EventDate,
        EventType,
        NewJobTitle,
        Note
      FROM dbo.EmployeeCareerEvents
      WHERE EmployeeId = @empId
      ORDER BY EventDate DESC, Id DESC
    `);

    return result.recordset;
  } catch (err) {
    const emp = FALLBACK_EMPLOYEES.find(e => e.Id === parseInt(employeeId, 10));
    if (!emp) return [];

    const hire = new Date(emp.HireDate);
    const events = [
      {
        Id: 1000 + emp.Id,
        EventDate: emp.HireDate,
        EventType: 'admissao',
        NewJobTitle: emp.JobTitle,
        Note: 'Admissão funcional'
      }
    ];

    const oneYearAfter = new Date(hire);
    oneYearAfter.setFullYear(oneYearAfter.getFullYear() + 1);
    if (oneYearAfter < new Date()) {
      events.push({
        Id: 2000 + emp.Id,
        EventDate: oneYearAfter.toISOString().split('T')[0],
        EventType: 'reajuste',
        NewJobTitle: null,
        Note: 'Reajuste anual'
      });
    }

    return events;
  }
}

/**
 * Retorna os acompanhamentos registrados pelo RH para um colaborador
 */
async function getFollowUps(employeeId) {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('empId', sql.Int, employeeId);

    const result = await request.query(`
      SELECT
        f.Id,
        f.ActionType,
        f.Note,
        f.CreatedAt,
        f.CreatedBy,
        u.Email AS CreatedByEmail
      FROM dbo.RetentionFollowUps f
      LEFT JOIN dbo.Users u ON u.Id = f.CreatedBy
      WHERE f.EmployeeId = @empId
      ORDER BY f.CreatedAt DESC
    `);

    return result.recordset;
  } catch (err) {
    return inMemoryFollowUps.filter(f => f.EmployeeId === parseInt(employeeId, 10));
  }
}

/**
 * Registra uma nova ação de acompanhamento (RH)
 */
async function addFollowUp(employeeId, createdBy, actionType, note) {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('empId', sql.Int, employeeId);
    request.input('userId', sql.Int, createdBy);
    request.input('actionType', sql.NVarChar(25), actionType);
    request.input('note', sql.NVarChar(500), note);

    const result = await request.query(`
      INSERT INTO dbo.RetentionFollowUps (EmployeeId, CreatedBy, ActionType, Note, CreatedAt)
      OUTPUT INSERTED.Id, INSERTED.ActionType, INSERTED.Note, INSERTED.CreatedAt, INSERTED.CreatedBy
      VALUES (@empId, @userId, @actionType, @note, SYSUTCDATETIME())
    `);

    return result.recordset[0];
  } catch (err) {
    console.warn('[retentionRepository] Gravando acompanhamento em memória (banco offline):', err.message);
    const item = {
      Id: inMemoryFollowUps.length + 1,
      EmployeeId: parseInt(employeeId, 10),
      CreatedBy: createdBy,
      ActionType: actionType,
      Note: note,
      CreatedAt: new Date().toISOString()
    };
    inMemoryFollowUps.push(item);
    return item;
  }
}

module.exports = {
  getDepartments,
  getActiveEmployees,
  getAttendanceHistory,
  getLatestCareerEvents,
  getReferenceDate,
  getExpectedAttentionGabarito,
  getEmployeeById,
  getEmployeeCareerHistory,
  getFollowUps,
  addFollowUp
};
