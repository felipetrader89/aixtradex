// Simulação de crescimento de capital (juros simples e compostos) das calculadoras públicas.
// Conta em dias úteis de mercado: 1 semana = 5 dias, 1 mês = 21 dias, 1 ano = 252 dias (convenção do mercado financeiro).
// A taxa pode ser ao dia, à semana ou ao mês; o prazo, em dias, semanas, meses ou anos.

export type RatePeriod = "day" | "week" | "month";
export type HorizonUnit = "day" | "week" | "month" | "year";
export type GrowthMode = "simple" | "compound";

export const DAYS_IN: Record<HorizonUnit, number> = { day: 1, week: 5, month: 21, year: 252 };
export const MAX_DAYS = 252 * 10; // 10 anos

export type GrowthInput = {
  principal: number; // capital inicial
  rate: number; // fração por período (0,01 = 1%)
  ratePeriod: RatePeriod;
  days: number; // prazo em dias úteis
  monthly: number; // aporte no fim de cada mês (0 = nenhum)
};

export type GrowthPoint = { day: number; simple: number; compound: number; deposited: number };

export type GrowthResult = {
  points: GrowthPoint[]; // dia 0..N
  final: { simple: number; compound: number; deposited: number };
};

// taxa equivalente ao dia (composta) e taxa diária linear (simples)
export function dailyRates(rate: number, period: RatePeriod) {
  const d = DAYS_IN[period];
  return { compound: Math.pow(1 + rate, 1 / d) - 1, simple: rate / d };
}

export function simulate(input: GrowthInput): GrowthResult {
  const { principal, rate, ratePeriod, monthly } = input;
  const days = Math.min(MAX_DAYS, Math.max(0, Math.round(input.days)));
  const r = dailyRates(rate, ratePeriod);
  let compound = principal;
  let deposited = principal;
  let simpleInterest = 0;
  const points: GrowthPoint[] = [{ day: 0, simple: principal, compound: principal, deposited }];
  for (let day = 1; day <= days; day++) {
    compound *= 1 + r.compound;
    simpleInterest += deposited * r.simple; // juros simples: sempre sobre o que foi depositado, nunca sobre o lucro
    if (monthly > 0 && day % DAYS_IN.month === 0 && day < days) {
      compound += monthly;
      deposited += monthly;
    }
    points.push({ day, simple: deposited + simpleInterest, compound, deposited });
  }
  const last = points[points.length - 1];
  return { points, final: { simple: last.simple, compound: last.compound, deposited: last.deposited } };
}

// Lucro dos primeiros k dias, sem aportes (pra mostrar "lucro no 1º dia / semana / mês").
export function firstProfit(principal: number, rate: number, period: RatePeriod, mode: GrowthMode, k: number) {
  const r = dailyRates(rate, period);
  return mode === "compound" ? principal * (Math.pow(1 + r.compound, k) - 1) : principal * r.simple * k;
}

// Em quantos dias úteis o saldo chega na meta (null = não chega em 10 anos).
export function daysToGoal(input: Omit<GrowthInput, "days">, mode: GrowthMode, goal: number): number | null {
  if (!(goal > 0)) return null;
  if (input.principal >= goal) return 0;
  const r = dailyRates(input.rate, input.ratePeriod);
  let compound = input.principal;
  let deposited = input.principal;
  let simpleInterest = 0;
  for (let day = 1; day <= MAX_DAYS; day++) {
    compound *= 1 + r.compound;
    simpleInterest += deposited * r.simple;
    const bal = mode === "compound" ? compound : deposited + simpleInterest;
    if (bal >= goal) return day;
    if (input.monthly > 0 && day % DAYS_IN.month === 0) {
      compound += input.monthly;
      deposited += input.monthly;
    }
  }
  return null;
}

export type ScheduleRow = { unit: HorizonUnit; index: number; deposits: number; profit: number; balance: number; totalPct: number };

// Tabela de evolução: agrupa por dia (até 1 mês e meio), semana (até 5 meses), mês (até 2 anos) ou ano.
export function schedule(result: GrowthResult, mode: GrowthMode): ScheduleRow[] {
  const pts = result.points;
  const n = pts.length - 1;
  if (n <= 0) return [];
  const unit: HorizonUnit = n <= 31 ? "day" : n <= 105 ? "week" : n <= 504 ? "month" : "year";
  const step = DAYS_IN[unit];
  const rows: ScheduleRow[] = [];
  const start = pts[0];
  let prev = start;
  for (let end = step, i = 1; prev.day < n; end += step, i++) {
    const p = pts[Math.min(end, n)];
    const bal = mode === "compound" ? p.compound : p.simple;
    const prevBal = mode === "compound" ? prev.compound : prev.simple;
    const deposits = p.deposited - prev.deposited;
    rows.push({
      unit,
      index: i,
      deposits,
      profit: bal - prevBal - deposits,
      balance: bal,
      totalPct: p.deposited > 0 ? (bal - p.deposited) / p.deposited : 0,
    });
    prev = p;
  }
  return rows;
}

// Quanto precisa ganhar pra recuperar uma perda (fração): 50% de perda pede 100% de ganho.
export function recoveryGain(loss: number) {
  if (!(loss > 0) || loss >= 1) return NaN;
  return loss / (1 - loss);
}

// Dias úteis pra recuperar uma perda a uma taxa composta por período.
export function recoveryDays(loss: number, rate: number, period: RatePeriod) {
  const g = recoveryGain(loss);
  const r = dailyRates(rate, period).compound;
  if (!Number.isFinite(g) || !(r > 0)) return NaN;
  return Math.ceil(Math.log(1 + g) / Math.log(1 + r) - 1e-9);
}
