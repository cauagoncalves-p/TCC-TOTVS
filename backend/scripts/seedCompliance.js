// backend/scripts/seedCompliance.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const bcrypt = require('bcryptjs');
const { poolPromise } = require('../src/config/db');

// Gerador de CPF válido fictício
function generateValidCpf(seedNumber) {
  const n = String(seedNumber).padStart(8, '0');
  const d = ('1' + n).split('').map(Number); // 9 dígitos
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += d[i] * (10 - i);
  let r1 = 11 - (s1 % 11);
  if (r1 >= 10) r1 = 0;

  let s2 = 0;
  for (let i = 0; i < 9; i++) s2 += d[i] * (11 - i);
  s2 += r1 * 2;
  let r2 = 11 - (s2 % 11);
  if (r2 >= 10) r2 = 0;

  return `${d.join('')}${r1}${r2}`;
}

const RULES_CATALOG = [
  // 1. Integridade de dados (Regra interna, SourceVerified = 1)
  {
    code: 'EMP_REQ_FIELDS',
    category: 'integridade',
    eventCode: null,
    severity: 'alta',
    title: 'Campos cadastrais obrigatórios ausentes',
    description: 'Registro do colaborador não possui todos os campos essenciais preenchidos.',
    guidance: 'Preencher todos os campos cadastrais obrigatórios do colaborador (nome, CPF, nascimento, admissão, cargo, departamento, salário).',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'EMP_CPF_INVALID',
    category: 'integridade',
    eventCode: null,
    severity: 'alta',
    title: 'CPF com dígitos verificadores inválidos',
    description: 'O número do CPF não atende ao algoritmo oficial de validação de dígitos verificadores.',
    guidance: 'Corrigir o número do CPF do colaborador consultando o documento oficial da Receita Federal.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'EMP_DUP_PERSON',
    category: 'integridade',
    eventCode: null,
    severity: 'media',
    title: 'Possível duplicidade de cadastro de pessoa física',
    description: 'Encontrado outro registro ativo com mesmo nome completo e mesma data de nascimento.',
    guidance: 'Verificar se os registros tratam-se da mesma pessoa e unificar o cadastro ou corrigir dados divergentes.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'EMP_DATES_ORDER',
    category: 'integridade',
    eventCode: null,
    severity: 'alta',
    title: 'Incoerência cronológica entre datas de admissão e desligamento',
    description: 'Data de desligamento é anterior à data de admissão ou data de admissão é excessivamente futura.',
    guidance: 'Ajustar a data de desligamento para que seja posterior ou igual à data de admissão e verificar datas futuras.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'EMP_STATUS_TERM',
    category: 'integridade',
    eventCode: null,
    severity: 'media',
    title: 'Inconsistência entre status do contrato e data de desligamento',
    description: 'Colaborador marcado com status "desligado" sem data de desligamento, ou com status "ativo" possuindo data de desligamento preenchida no passado.',
    guidance: 'Preencher a data de desligamento se o colaborador estiver desligado ou reativar o status se o vínculo estiver ativo.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'PAY_TOTALS',
    category: 'integridade',
    eventCode: null,
    severity: 'alta',
    title: 'Divergência entre totais do holerite e soma dos itens',
    description: 'O valor bruto ou os descontos totais do holerite divergem da soma das rubricas cadastradas.',
    guidance: 'Recalcular a folha de pagamento do colaborador na competência para que o valor bruto e descontos batam com as rubricas.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'PAY_NET_NONPOSITIVE',
    category: 'integridade',
    eventCode: null,
    severity: 'media',
    title: 'Salário líquido do holerite menor ou igual a zero',
    description: 'O valor líquido do holerite resultou em valor zerado ou negativo após aplicação dos descontos.',
    guidance: 'Revisar descontos aplicados na competência para garantir que não ultrapassem o limite legal sobre a remuneração.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'VAC_OVER',
    category: 'integridade',
    eventCode: null,
    severity: 'media',
    title: 'Dias de férias gozados excedem o saldo de direito',
    description: 'O número de dias de férias usufruídos ultrapassa o total de dias de direito do período aquisitivo.',
    guidance: 'Ajustar o registro de gozo de férias do período aquisitivo do colaborador para respeitar o saldo adquirido.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'LEAVE_DATES',
    category: 'integridade',
    eventCode: null,
    severity: 'alta',
    title: 'Data de término de afastamento anterior à data de início',
    description: 'O período do afastamento possui data de término anterior à data de início.',
    guidance: 'Corrigir o período de afastamento garantindo que a data final seja posterior ou igual à data inicial.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },
  {
    code: 'LEAVE_OVERLAP',
    category: 'integridade',
    eventCode: null,
    severity: 'media',
    title: 'Afastamentos com períodos sobrepostos para o mesmo colaborador',
    description: 'Existem dois ou mais afastamentos concomitantes cadastrados para o mesmo colaborador com datas sobrepostas.',
    guidance: 'Ajustar as datas de início e término dos afastamentos para evitar sobreposição indevida de períodos.',
    sourceType: 'interna',
    sourceReference: 'Regra interna do sistema',
    sourceVerified: 1
  },

  // 2. Regras com base legal oficial (SourceVerified = 0 - a conferir no texto vigente)
  {
    code: 'JOB_WEEKLY_HOURS',
    category: 'clt',
    eventCode: null,
    severity: 'alta',
    title: 'Jornada semanal superior ao limite legal',
    description: 'A jornada de trabalho semanal contratual cadastrada excede a jornada padrão legal.',
    guidance: 'Adequar a carga horária semanal contratual ao teto legal vigente ou formalizar regime de compensação válido.',
    sourceType: 'oficial',
    sourceReference: 'CLT e Constituição Federal (jornada de trabalho)',
    sourceVerified: 0
  },
  {
    code: 'EMP_MIN_AGE',
    category: 'clt',
    eventCode: null,
    severity: 'alta',
    title: 'Idade na admissão inferior ao mínimo legal',
    description: 'A idade calculada na data de admissão é inferior à idade mínima permitida pela legislação.',
    guidance: 'Verificar a data de nascimento e o tipo de contratação (ex.: contrato de aprendizagem a partir de 14 anos).',
    sourceType: 'oficial',
    sourceReference: 'Constituição Federal e CLT (idade mínima)',
    sourceVerified: 0
  },

  // 3. Checklist pré-envio eSocial (SourceVerified = 0 - a conferir no texto vigente)
  {
    code: 'ESOCIAL_S2200',
    category: 'esocial',
    eventCode: 'S-2200',
    severity: 'alta',
    title: 'Inconsistência cadastral para pré-envio do evento S-2200 (Admissão)',
    description: 'O cadastro do colaborador para admissão possui pendências impeditivas (CPF inválido, dados obrigatórios ausentes ou jornada irregular).',
    guidance: 'Preencher e validar todos os dados obrigatórios do colaborador exigidos pelo leiaute de admissão do eSocial.',
    sourceType: 'oficial',
    sourceReference: 'Manual de Orientação do eSocial (MOS) - Evento S-2200',
    sourceVerified: 0
  },
  {
    code: 'ESOCIAL_S2230',
    category: 'esocial',
    eventCode: 'S-2230',
    severity: 'alta',
    title: 'Inconsistência em afastamento para pré-envio do evento S-2230',
    description: 'O evento de afastamento temporário possui inconsistências nas datas ou tipo de afastamento.',
    guidance: 'Verificar motivo, data de início e consistência do período de afastamento conforme o leiaute do eSocial.',
    sourceType: 'oficial',
    sourceReference: 'Manual de Orientação do eSocial (MOS) - Evento S-2230',
    sourceVerified: 0
  },
  {
    code: 'ESOCIAL_S2299',
    category: 'esocial',
    eventCode: 'S-2299',
    severity: 'alta',
    title: 'Inconsistência em desligamento para pré-envio do evento S-2299',
    description: 'O evento de desligamento possui data ausente ou cronologicamente inconsistente com a admissão.',
    guidance: 'Preencher data de desligamento válida e coerente com a data de admissão conforme o leiaute do eSocial.',
    sourceType: 'oficial',
    sourceReference: 'Manual de Orientação do eSocial (MOS) - Evento S-2299',
    sourceVerified: 0
  }
];

const DEPARTMENTS = ['Atendimento', 'Tecnologia', 'Financeiro', 'Comercial', 'Logística', 'RH'];

async function seed() {
  const pool = await poolPromise;
  console.log('=== Iniciando Seed do Módulo de Compliance Inteligente (Parte 4) ===');

  // Descobre nome exato da tabela de usuários
  const uTbl = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME) = 'users'");
  const userTable = uTbl.recordset[0]?.TABLE_NAME || 'users';

  // 1. Catálogo de Regras
  console.log('1. Sincronizando catálogo de regras...');
  for (const r of RULES_CATALOG) {
    const existing = await pool.request()
      .input('code', r.code)
      .query('SELECT Id FROM dbo.ComplianceRules WHERE Code = @code');

    if (existing.recordset.length > 0) {
      await pool.request()
        .input('code', r.code)
        .input('category', r.category)
        .input('eventCode', r.eventCode)
        .input('severity', r.severity)
        .input('title', r.title)
        .input('description', r.description)
        .input('guidance', r.guidance)
        .input('sourceType', r.sourceType)
        .input('sourceReference', r.sourceReference)
        .input('sourceVerified', r.sourceVerified)
        .query(`
          UPDATE dbo.ComplianceRules
          SET Category = @category, EventCode = @eventCode, Severity = @severity,
              Title = @title, Description = @description, Guidance = @guidance,
              SourceType = @sourceType, SourceReference = @sourceReference, SourceVerified = @sourceVerified
          WHERE Code = @code
        `);
    } else {
      await pool.request()
        .input('code', r.code)
        .input('category', r.category)
        .input('eventCode', r.eventCode)
        .input('severity', r.severity)
        .input('title', r.title)
        .input('description', r.description)
        .input('guidance', r.guidance)
        .input('sourceType', r.sourceType)
        .input('sourceReference', r.sourceReference)
        .input('sourceVerified', r.sourceVerified)
        .query(`
          INSERT INTO dbo.ComplianceRules (
            Code, Category, EventCode, Severity, Title, Description, Guidance,
            SourceType, SourceReference, SourceVerified, IsActive
          ) VALUES (
            @code, @category, @eventCode, @severity, @title, @description, @guidance,
            @sourceType, @sourceReference, @sourceVerified, 1
          )
        `);
    }
  }

  // 2. Limpeza idempotente dos colaboradores de teste criados pelo seedCompliance (@seed.exemplo.com)
  console.log('2. Limpando dados anteriores gerados pelo seed de compliance...');
  // Limpa inconsistências e eventos ligados aos colaboradores seed
  await pool.request().query(`
    DELETE ci FROM dbo.ComplianceIssues ci
    JOIN dbo.Employees e ON e.Id = ci.EmployeeId
    JOIN dbo.[${userTable}] u ON u.id = e.UserId
    WHERE u.email LIKE '%@seed.exemplo.com' OR e.Registration LIKE 'S%';

    DELETE ev FROM dbo.EsocialEvents ev
    JOIN dbo.Employees e ON e.Id = ev.EmployeeId
    JOIN dbo.[${userTable}] u ON u.id = e.UserId
    WHERE u.email LIKE '%@seed.exemplo.com' OR e.Registration LIKE 'S%';

    DELETE l FROM dbo.Leaves l
    JOIN dbo.Employees e ON e.Id = l.EmployeeId
    JOIN dbo.[${userTable}] u ON u.id = e.UserId
    WHERE u.email LIKE '%@seed.exemplo.com' OR e.Registration LIKE 'S%';

    DELETE pi FROM dbo.PayslipItems pi
    JOIN dbo.Payslips p ON p.Id = pi.PayslipId
    JOIN dbo.Employees e ON e.Id = p.EmployeeId
    JOIN dbo.[${userTable}] u ON u.id = e.UserId
    WHERE u.email LIKE '%@seed.exemplo.com' OR e.Registration LIKE 'S%';

    DELETE p FROM dbo.Payslips p
    JOIN dbo.Employees e ON e.Id = p.EmployeeId
    JOIN dbo.[${userTable}] u ON u.id = e.UserId
    WHERE u.email LIKE '%@seed.exemplo.com' OR e.Registration LIKE 'S%';

    DELETE vb FROM dbo.VacationBalances vb
    JOIN dbo.Employees e ON e.Id = vb.EmployeeId
    JOIN dbo.[${userTable}] u ON u.id = e.UserId
    WHERE u.email LIKE '%@seed.exemplo.com' OR e.Registration LIKE 'S%';

    DELETE e FROM dbo.Employees e
    JOIN dbo.[${userTable}] u ON u.id = e.UserId
    WHERE u.email LIKE '%@seed.exemplo.com' OR e.Registration LIKE 'S%';

    DELETE FROM dbo.[${userTable}] WHERE email LIKE '%@seed.exemplo.com';
  `);

  // 3. Criação de 30 colaboradores (18 saudáveis e 12 com defeitos plantados)
  console.log('3. Criando 30 colaboradores fictícios (18 saudáveis e 12 com defeitos plantados)...');
  const tempHash = await bcrypt.hash('123456', 10);

  // Lista dos 30 colaboradores com configurações
  const employeesSpec = [];
  for (let i = 1; i <= 30; i++) {
    const reg = `S${String(i).padStart(4, '0')}`;
    const dept = DEPARTMENTS[(i - 1) % DEPARTMENTS.length];
    const email = `colab.${reg.toLowerCase()}@seed.exemplo.com`;
    const validCpf = generateValidCpf(1000 + i);

    // Configuração base saudável
    let spec = {
      index: i,
      name: `Colaborador Teste ${reg}`,
      email,
      registration: reg,
      department: dept,
      jobTitle: `Especialista de ${dept}`,
      cpf: validCpf,
      birthDate: '1992-04-15',
      hireDate: '2023-01-10',
      terminationDate: null,
      status: 'ativo',
      baseSalary: 4500.00,
      weeklyHours: 40.0,
      contractType: 'CLT',
      // Extras
      payslipDefect: null,
      vacationDefect: null,
      leaveDefect: null,
      defectNote: null
    };

    // Plantar defeitos em registros específicos (cobrir todas as regras)
    if (i === 1) {
      // Regra 1: EMP_REQ_FIELDS (salário nulo e cargo vazio)
      spec.baseSalary = null;
      spec.jobTitle = '';
      spec.defectNote = 'Defeito: campos obrigatórios ausentes';
    } else if (i === 2) {
      // Regra 2: EMP_CPF_INVALID (CPF com dígitos verificadores inválidos)
      spec.cpf = '11111111111';
      spec.defectNote = 'Defeito: CPF inválido';
    } else if (i === 3) {
      // Regra 3: EMP_DUP_PERSON (mesmo nome e data de nascimento do registro 4)
      spec.name = 'Duplicado Silva';
      spec.birthDate = '1989-08-20';
      spec.defectNote = 'Defeito: Pessoa duplicada (registro 1 de 2)';
    } else if (i === 4) {
      // Regra 3: EMP_DUP_PERSON (par do registro 3)
      spec.name = 'Duplicado Silva';
      spec.birthDate = '1989-08-20';
      spec.defectNote = 'Defeito: Pessoa duplicada (registro 2 de 2)';
    } else if (i === 5) {
      // Regra 4: EMP_DATES_ORDER (desligamento anterior à admissão)
      spec.hireDate = '2024-06-01';
      spec.terminationDate = '2024-03-10';
      spec.status = 'desligado';
      spec.defectNote = 'Defeito: desligamento antes da admissão';
    } else if (i === 6) {
      // Regra 5: EMP_STATUS_TERM (desligado sem data de desligamento)
      spec.status = 'desligado';
      spec.terminationDate = null;
      spec.defectNote = 'Defeito: status desligado sem TerminationDate';
    } else if (i === 7) {
      // Regra 6: PAY_TOTALS (holerite onde a soma das rubricas não bate)
      spec.payslipDefect = 'TOTALS_MISMATCH';
      spec.defectNote = 'Defeito: totais do holerite divergem das rubricas';
    } else if (i === 8) {
      // Regra 7: PAY_NET_NONPOSITIVE (descontos >= proventos)
      spec.payslipDefect = 'NET_NEGATIVE';
      spec.defectNote = 'Defeito: salário líquido negativo ou zero';
    } else if (i === 9) {
      // Regra 8: VAC_OVER (férias tiradas acima do direito)
      spec.vacationDefect = 'OVER_TAKEN';
      spec.defectNote = 'Defeito: dias tirados (35) > dias de direito (30)';
    } else if (i === 10) {
      // Regra 9: LEAVE_DATES (afastamento com fim anterior ao início)
      spec.leaveDefect = 'END_BEFORE_START';
      spec.defectNote = 'Defeito: afastamento com fim antes do início';
    } else if (i === 11) {
      // Regra 10: LEAVE_OVERLAP (dois afastamentos sobrepostos)
      spec.leaveDefect = 'OVERLAP';
      spec.defectNote = 'Defeito: afastamentos sobrepostos';
    } else if (i === 12) {
      // Regra 11: JOB_WEEKLY_HOURS (jornada semanal de 48h > 44h)
      spec.weeklyHours = 48.0;
      spec.defectNote = 'Defeito: jornada semanal de 48h';
    } else if (i === 13) {
      // Regra 12: EMP_MIN_AGE (nascido em 2012, admitido em 2024 - 12 anos de idade)
      spec.birthDate = '2012-05-10';
      spec.hireDate = '2024-06-01';
      spec.defectNote = 'Defeito: idade na admissão de 12 anos (< 14)';
    }

    employeesSpec.push(spec);
  }

  // Insere colaboradores, férias, holerites e afastamentos
  const createdEmployees = [];
  for (const s of employeesSpec) {
    // 1. Cria usuário
    const uRes = await pool.request()
      .input('name', s.name)
      .input('email', s.email)
      .input('pwd', tempHash)
      .input('role', 'colaborador')
      .query(`
        INSERT INTO dbo.[${userTable}] (name, email, password_hash, role, created_at)
        OUTPUT INSERTED.id
        VALUES (@name, @email, @pwd, @role, GETDATE())
      `);
    const userId = uRes.recordset[0].id;

    // 2. Cria employee
    const eRes = await pool.request()
      .input('userId', userId)
      .input('fullName', s.name)
      .input('reg', s.registration)
      .input('jobTitle', s.jobTitle)
      .input('dept', s.department)
      .input('hireDate', s.hireDate)
      .input('termDate', s.terminationDate)
      .input('cpf', s.cpf)
      .input('birthDate', s.birthDate)
      .input('salary', s.baseSalary)
      .input('weeklyHours', s.weeklyHours)
      .input('contractType', s.contractType)
      .input('status', s.status)
      .query(`
        INSERT INTO dbo.Employees (
          UserId, FullName, Registration, JobTitle, Department, HireDate, TerminationDate,
          Cpf, BirthDate, BaseSalary, WeeklyHours, ContractType, Status
        )
        OUTPUT INSERTED.Id
        VALUES (
          @userId, @fullName, @reg, @jobTitle, @dept, @hireDate, @termDate,
          @cpf, @birthDate, @salary, @weeklyHours, @contractType, @status
        )
      `);
    const empId = eRes.recordset[0].Id;
    createdEmployees.push({ empId, ...s });

    // 3. Saldo de férias
    let daysEntitled = 30;
    let daysTaken = 10;
    if (s.vacationDefect === 'OVER_TAKEN') {
      daysTaken = 35; // Defeito VAC_OVER
    }
    await pool.request()
      .input('empId', empId)
      .input('pStart', '2024-01-10')
      .input('pEnd', '2025-01-09')
      .input('entitled', daysEntitled)
      .input('taken', daysTaken)
      .query(`
        INSERT INTO dbo.VacationBalances (EmployeeId, PeriodStart, PeriodEnd, DaysEntitled, DaysTaken)
        VALUES (@empId, @pStart, @pEnd, @entitled, @taken)
      `);

    // 4. Holerite (competência 2026-10)
    let gross = 4500.00;
    let deductions = 650.00;
    let rubricaDeduction = 650.00;

    if (s.payslipDefect === 'TOTALS_MISMATCH') {
      // Divergência: cabeçalho diz deduções 650, mas a rubrica terá 900
      deductions = 650.00;
      rubricaDeduction = 900.00; // Defeito PAY_TOTALS
    } else if (s.payslipDefect === 'NET_NEGATIVE') {
      // Dedução maior que salário bruto
      deductions = 4800.00;
      rubricaDeduction = 4800.00; // Defeito PAY_NET_NONPOSITIVE
    }

    const payRes = await pool.request()
      .input('empId', empId)
      .input('comp', '2026-10')
      .input('gross', gross)
      .input('ded', deductions)
      .query(`
        INSERT INTO dbo.Payslips (EmployeeId, Competence, GrossAmount, TotalDeductions)
        OUTPUT INSERTED.Id
        VALUES (@empId, @comp, @gross, @ded)
      `);
    const payId = payRes.recordset[0].Id;

    await pool.request()
      .input('payId', payId)
      .input('gross', gross)
      .input('ded', rubricaDeduction)
      .query(`
        INSERT INTO dbo.PayslipItems (PayslipId, Code, Description, Kind, Amount)
        VALUES
          (@payId, '1000', 'Salário Base', 'P', @gross),
          (@payId, '2010', 'Descontos Diversos', 'D', @ded);
      `);

    // 5. Afastamentos
    if (s.leaveDefect === 'END_BEFORE_START') {
      // Defeito LEAVE_DATES: fim antes do início
      await pool.request()
        .input('empId', empId)
        .input('type', 'inss')
        .input('start', '2026-08-20')
        .input('end', '2026-08-10')
        .query(`INSERT INTO dbo.Leaves (EmployeeId, LeaveType, StartDate, EndDate) VALUES (@empId, @type, @start, @end)`);
    } else if (s.leaveDefect === 'OVERLAP') {
      // Defeito LEAVE_OVERLAP: dois afastamentos sobrepostos
      await pool.request()
        .input('empId', empId)
        .input('type1', 'inss')
        .input('start1', '2026-07-01')
        .input('end1', '2026-07-20')
        .input('type2', 'outros')
        .input('start2', '2026-07-15')
        .input('end2', '2026-07-30')
        .query(`
          INSERT INTO dbo.Leaves (EmployeeId, LeaveType, StartDate, EndDate)
          VALUES (@empId, @type1, @start1, @end1), (@empId, @type2, @start2, @end2);
        `);
    } else if (s.index === 15) {
      // Afastamento saudável
      await pool.request()
        .input('empId', empId)
        .input('type', 'maternidade')
        .input('start', '2026-05-01')
        .input('end', '2026-08-29')
        .query(`INSERT INTO dbo.Leaves (EmployeeId, LeaveType, StartDate, EndDate) VALUES (@empId, @type, @start, @end)`);
    }
  }

  // 4. Criação de Eventos eSocial simulados (S-2200, S-2230, S-2299)
  console.log('4. Criando eventos eSocial simulados (S-2200, S-2230, S-2299)...');
  // Evento S-2200 com problema (Colaborador 2 - CPF inválido)
  const emp2 = createdEmployees.find(e => e.index === 2);
  await pool.request()
    .input('empId', emp2.empId)
    .input('code', 'S-2200')
    .input('date', '2026-10-01')
    .query(`INSERT INTO dbo.EsocialEvents (EmployeeId, EventCode, EventDate, Status) VALUES (@empId, @code, @date, 'pendente')`);

  // Evento S-2200 saudável (Colaborador 20)
  const emp20 = createdEmployees.find(e => e.index === 20);
  await pool.request()
    .input('empId', emp20.empId)
    .input('code', 'S-2200')
    .input('date', '2026-10-01')
    .query(`INSERT INTO dbo.EsocialEvents (EmployeeId, EventCode, EventDate, Status) VALUES (@empId, @code, @date, 'pendente')`);

  // Evento S-2230 com problema (Colaborador 10 - Afastamento fim antes do início)
  const emp10 = createdEmployees.find(e => e.index === 10);
  const leave10 = (await pool.request().input('empId', emp10.empId).query('SELECT Id FROM dbo.Leaves WHERE EmployeeId = @empId')).recordset[0];
  await pool.request()
    .input('empId', emp10.empId)
    .input('leaveId', leave10 ? leave10.Id : null)
    .input('code', 'S-2230')
    .input('date', '2026-08-20')
    .query(`INSERT INTO dbo.EsocialEvents (EmployeeId, LeaveId, EventCode, EventDate, Status) VALUES (@empId, @leaveId, @code, @date, 'pendente')`);

  // Evento S-2230 saudável (Colaborador 15)
  const emp15 = createdEmployees.find(e => e.index === 15);
  const leave15 = (await pool.request().input('empId', emp15.empId).query('SELECT Id FROM dbo.Leaves WHERE EmployeeId = @empId')).recordset[0];
  await pool.request()
    .input('empId', emp15.empId)
    .input('leaveId', leave15 ? leave15.Id : null)
    .input('code', 'S-2230')
    .input('date', '2026-05-01')
    .query(`INSERT INTO dbo.EsocialEvents (EmployeeId, LeaveId, EventCode, EventDate, Status) VALUES (@empId, @leaveId, @code, @date, 'pendente')`);

  // Evento S-2299 com problema (Colaborador 5 - Desligamento antes da admissão)
  const emp5 = createdEmployees.find(e => e.index === 5);
  await pool.request()
    .input('empId', emp5.empId)
    .input('code', 'S-2299')
    .input('date', '2026-10-15')
    .query(`INSERT INTO dbo.EsocialEvents (EmployeeId, EventCode, EventDate, Status) VALUES (@empId, @code, @date, 'pendente')`);

  // Evento S-2299 saudável (Colaborador 25 - Desligado regularmente)
  const emp25 = createdEmployees.find(e => e.index === 25);
  await pool.request()
    .input('empId', emp25.empId)
    .query(`UPDATE dbo.Employees SET Status = 'desligado', TerminationDate = '2026-09-30' WHERE Id = @empId`);
  await pool.request()
    .input('empId', emp25.empId)
    .input('code', 'S-2299')
    .input('date', '2026-09-30')
    .query(`INSERT INTO dbo.EsocialEvents (EmployeeId, EventCode, EventDate, Status) VALUES (@empId, @code, @date, 'pendente')`);

  // 5. Catálogo de obrigações ilustrativas (Fase B/Seed)
  console.log('5. Cadastrando obrigações ilustrativas (SourceVerified = 0)...');
  const obligations = [
    {
      code: 'FECHAMENTO_FOLHA',
      name: 'Fechamento da Folha de Pagamento Mensal',
      frequency: 'mensal',
      dueDay: 5,
      dueRuleText: 'Até o 5º dia útil do mês subsequente (ilustrativo, conferir na fonte oficial)',
      sourceReference: 'Manual de Rotinas Trabalhistas (ilustrativo)'
    },
    {
      code: 'ESOCIAL_PERIODICOS',
      name: 'Envio de Eventos Periódicos do eSocial (S-1200 a S-1299)',
      frequency: 'mensal',
      dueDay: 15,
      dueRuleText: 'Até o dia 15 do mês subsequente (ilustrativo, conferir na fonte oficial)',
      sourceReference: 'Manual de Orientação do eSocial (MOS) (ilustrativo)'
    },
    {
      code: 'RECOLHIMENTO_FGTS',
      name: 'Recolhimento Mensal do FGTS Digital',
      frequency: 'mensal',
      dueDay: 20,
      dueRuleText: 'Até o dia 20 do mês subsequente (ilustrativo, conferir na fonte oficial)',
      sourceReference: 'FGTS Digital / Guia Oficial (ilustrativo)'
    }
  ];

  for (const obl of obligations) {
    const existing = await pool.request().input('code', obl.code).query('SELECT Id FROM dbo.Obligations WHERE Code = @code');
    if (existing.recordset.length === 0) {
      await pool.request()
        .input('code', obl.code)
        .input('name', obl.name)
        .input('freq', obl.frequency)
        .input('dueDay', obl.dueDay)
        .input('ruleText', obl.dueRuleText)
        .input('source', obl.sourceReference)
        .query(`
          INSERT INTO dbo.Obligations (Code, Name, Frequency, DueDay, DueRuleText, SourceReference, SourceVerified, IsActive)
          VALUES (@code, @name, @freq, @dueDay, @ruleText, @source, 0, 1)
        `);
    }
  }

  console.log('\nSeed de Compliance concluído com sucesso!');
  console.log(`- 30 Colaboradores cadastrados`);
  console.log(`- 12 Defeitos plantados nas regras do catálogo`);
  console.log(`- 6 Eventos eSocial criados (3 com pendências e 3 saudáveis)`);
  console.log(`- 15 Regras no catálogo com suas respectivas fontes`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Erro no seed de compliance:', err);
  process.exit(1);
});
