// backend/scripts/seedAnalytics.js
/**
 * Script de Seed para o Módulo de Analytics / Inteligência Preditiva (Parte 3)
 * Gera 24 meses de métricas com dados agregados por departamento e mês.
 * Idempotente e com semente pseudoaleatória fixa para resultados 100% reproduzíveis.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const { sql, poolPromise } = require('../src/config/db');

// Gerador pseudoaleatório LCG com semente fixa
function createPrng(seed = 123456789) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 6 Departamentos oficiais
const DEPARTMENTS = [
  'Atendimento',
  'Tecnologia',
  'Financeiro',
  'Comercial',
  'Logística',
  'RH'
];

// Dias úteis típicos por mês (aproximado 20 a 22)
const WORK_DAYS_TABLE = [22, 20, 22, 21, 22, 21, 23, 22, 21, 22, 20, 22];

function get24Months() {
  const now = new Date();
  // Se estivermos em 2026 ou posterior, usa outubro/2026 como último mês fechado
  // (compatível com os cenários e datas de Payslips/Admissão do case)
  const end = (now.getFullYear() === 2026 && now.getMonth() >= 10) || now.getFullYear() > 2026
    ? new Date(2026, 9, 1) // Outubro/2026
    : new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const months = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}-01`);
  }
  return months;
}

async function seed() {
  const pool = await poolPromise;
  console.log('=== Iniciando Seed do Módulo de Inteligência Preditiva (Analytics) ===');

  const rand = createPrng(42); // semente fixa para reprodutibilidade

  // 1. Garantir que os departamentos existam na tabela Departments
  console.log('1. Sincronizando departamentos...');
  const deptMap = {}; // Name -> Id
  for (const name of DEPARTMENTS) {
    const existing = await pool.request()
      .input('name', name)
      .query('SELECT Id, Name FROM dbo.Departments WHERE Name = @name');

    if (existing.recordset.length > 0) {
      deptMap[name] = existing.recordset[0].Id;
    } else {
      const ins = await pool.request()
        .input('name', name)
        .query('INSERT INTO dbo.Departments (Name, IsActive) OUTPUT INSERTED.Id VALUES (@name, 1)');
      deptMap[name] = ins.recordset[0].Id;
      console.log(`  Departamento criado: ${name} (Id: ${deptMap[name]})`);
    }
  }

  // 2. Limpar dados anteriores de métricas, previsões e alertas para garantir idempotência
  console.log('2. Limpando dados anteriores de métricas, previsões e alertas...');
  await pool.request().query('DELETE FROM dbo.Alerts');
  try {
    await pool.request().query('DELETE FROM dbo.Predictions');
  } catch (e) {
    // Tabela pode não existir ainda se a migração da Fase B não rodou
  }
  await pool.request().query('DELETE FROM dbo.DepartmentMonthlyMetrics');

  // 3. Gerar os 24 meses de métricas para cada departamento
  const months = get24Months();
  console.log(`3. Gerando métricas para 24 meses (${months[0]} até ${months[months.length - 1]})...`);

  for (const deptName of DEPARTMENTS) {
    const deptId = deptMap[deptName];
    console.log(`  Gerando série para [${deptName}]...`);

    let headcount = deptName === 'Atendimento' ? 52 :
                    deptName === 'Tecnologia' ? 44 :
                    deptName === 'Financeiro' ? 24 :
                    deptName === 'Comercial' ? 36 :
                    deptName === 'Logística' ? 40 : 16; // RH

    for (let mIdx = 0; mIdx < months.length; mIdx++) {
      const monthRef = months[mIdx];
      const mDate = new Date(monthRef + 'T00:00:00Z');
      const workDays = WORK_DAYS_TABLE[mDate.getUTCMonth()] || 21;

      let absenceDays = 0;
      let overtimeHours = 0;
      let hires = 0;
      let terminations = 0;

      // Ruído leve
      const noise = (rand() - 0.5) * 0.15;

      if (deptName === 'Atendimento') {
        // Cenário Principal: Estável até mês 18. Nos últimos 5 meses (19 a 23 / 24)
        // faltas e horas extras disparam juntas, seguidas de alta nos desligamentos.
        if (mIdx < 19) {
          // Fase estável: ausência ~2.5%, HE ~6h/colab
          const targetAbsRate = 0.024 + noise * 0.005;
          absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;
          overtimeHours = Math.round(headcount * (5.5 + noise * 2) * 10) / 10;
          hires = rand() > 0.6 ? 1 : 0;
          terminations = rand() > 0.7 ? 1 : 0;
        } else {
          // Escalada consecutiva nos últimos 5 meses (mIdx: 19, 20, 21, 22, 23)
          const step = mIdx - 18; // 1 a 5
          // Faltas crescendo: 3.4%, 4.5%, 5.8%, 7.2%, 8.8%
          const targetAbsRate = 0.025 + step * 0.013 + noise * 0.003;
          absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;

          // Horas extras crescendo: 8.5h, 11.5h, 15.5h, 19.5h, 23.5h
          const targetOtPerEmp = 6.0 + step * 3.5 + noise * 1.5;
          overtimeHours = Math.round(headcount * targetOtPerEmp * 10) / 10;

          // Desligamentos aumentando nos meses finais
          if (step <= 2) {
            hires = 1;
            terminations = 1;
          } else if (step === 3) {
            hires = 0;
            terminations = 2;
          } else if (step === 4) {
            hires = 1;
            terminations = 4;
          } else {
            // step === 5 (último mês)
            hires = 0;
            terminations = 5;
          }
        }
      } else if (deptName === 'Logística') {
        // Cenário: Horas extras altas de forma crônica (> 15h/colab em quase todos os meses)
        const targetAbsRate = 0.022 + noise * 0.004;
        absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;

        // HE crônica: entre 16.5h e 20.5h por colaborador
        const targetOtPerEmp = 17.5 + (rand() - 0.5) * 3.0;
        overtimeHours = Math.round(headcount * targetOtPerEmp * 10) / 10;

        hires = rand() > 0.5 ? 1 : 0;
        terminations = rand() > 0.6 ? 1 : 0;
      } else if (deptName === 'Comercial') {
        // Cenário: Absenteísmo salta nos meses 20 e 21, e 2 meses depois (meses 22 e 23)
        // o turnover dispara (sinal precoce de turnover induzido por absenteísmo/desmotivação)
        if (mIdx < 20) {
          const targetAbsRate = 0.020 + noise * 0.004;
          absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;
          overtimeHours = Math.round(headcount * (4.5 + noise * 1.5) * 10) / 10;
          hires = rand() > 0.6 ? 1 : 0;
          terminations = rand() > 0.7 ? 1 : 0;
        } else if (mIdx === 20 || mIdx === 21) {
          // Salto de absenteísmo (>30% acima da média anterior)
          const targetAbsRate = 0.046 + noise * 0.005; // ~4.6%
          absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;
          overtimeHours = Math.round(headcount * (5.0 + noise * 1.5) * 10) / 10;
          hires = 0;
          terminations = 1;
        } else {
          // Meses 22 e 23: turnover salta para 3 e 4 desligamentos
          const targetAbsRate = 0.040 + noise * 0.005;
          absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;
          overtimeHours = Math.round(headcount * (5.5 + noise * 1.5) * 10) / 10;
          hires = 1;
          terminations = mIdx === 22 ? 3 : 4; // Turnover rate de 8.3% a 11.1%
        }
      } else if (deptName === 'Tecnologia') {
        // Cenário estável: absenteísmo baixo, HE moderada, turnover baixo
        const targetAbsRate = 0.018 + noise * 0.004;
        absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;
        overtimeHours = Math.round(headcount * (4.8 + noise * 1.5) * 10) / 10;
        hires = rand() > 0.5 ? 1 : 0;
        terminations = rand() > 0.75 ? 1 : 0;
      } else if (deptName === 'Financeiro') {
        // Cenário estável com pico pontual em meses de fechamento (dez/jan)
        const isClosingMonth = mDate.getUTCMonth() === 11 || mDate.getUTCMonth() === 0;
        const targetAbsRate = 0.015 + noise * 0.003;
        absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;
        const targetOt = isClosingMonth ? 9.0 : 3.5;
        overtimeHours = Math.round(headcount * (targetOt + noise * 1.2) * 10) / 10;
        hires = rand() > 0.8 ? 1 : 0;
        terminations = rand() > 0.85 ? 1 : 0;
      } else {
        // RH: Pequeno e muito estável
        const targetAbsRate = 0.014 + noise * 0.003;
        absenceDays = Math.round(headcount * workDays * targetAbsRate * 10) / 10;
        overtimeHours = Math.round(headcount * (2.8 + noise * 1.0) * 10) / 10;
        hires = rand() > 0.9 ? 1 : 0;
        terminations = 0;
      }

      // Atualiza headcount para o mês seguinte conforme entradas e saídas
      headcount = Math.max(5, headcount + hires - terminations);

      // Inserção no banco
      await pool.request()
        .input('deptId', deptId)
        .input('monthRef', monthRef)
        .input('headcount', headcount)
        .input('workDays', workDays)
        .input('absenceDays', absenceDays)
        .input('overtimeHours', overtimeHours)
        .input('hires', hires)
        .input('terminations', terminations)
        .query(`
          INSERT INTO dbo.DepartmentMonthlyMetrics (
            DepartmentId, MonthRef, Headcount, WorkDays, AbsenceDays, OvertimeHours, Hires, Terminations
          ) VALUES (
            @deptId, @monthRef, @headcount, @workDays, @absenceDays, @overtimeHours, @hires, @terminations
          )
        `);
    }
  }

  // 4. Verificação das métricas inseridas
  const countResult = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.DepartmentMonthlyMetrics');
  console.log(`\nSeed finalizado com sucesso! Total de registros em DepartmentMonthlyMetrics: ${countResult.recordset[0].total} (esperado: ${DEPARTMENTS.length * 24})`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Erro ao executar seed de analytics:', err);
  process.exit(1);
});
