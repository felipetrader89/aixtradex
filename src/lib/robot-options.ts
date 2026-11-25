// Opções e padrões da configuração do robô - usados no servidor e no formulário (sem nada secreto aqui).

// Pares mais negociados. Nome base: o robô acha o nome da corretora (sufixo m, c, .pro...).
export const ROBOT_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD"] as const;

// % do saldo arriscado em cada entrada (até o fechamento na perda). Moderado = o padrão de sempre no ouro (0,01 a cada $250).
export const RISK_PROFILES = { conservative: 1, moderate: 2, aggressive: 3 } as const;
export type RiskProfile = keyof typeof RISK_PROFILES | "custom";

export const PCT_OPTIONS = [0, 1.5, 2.5, 3.5, 5.5, 10.5, 15, 20] as const; // metas e limites de perda (0 = desligado)
export const MAX_POSITIONS = 10;
export const DD_CAP_DEFAULT = 30; // teto do rebaixamento que o cliente escolhe (o admin pode mudar)
export const RSI_PERIODS = [5, 7, 8, 10, 12, 14] as const;
export const RSI_TIMEFRAMES = [1, 5, 15, 30] as const;
export const ADX_LEVELS = [20, 25, 30, 35, 40] as const;
export const NEWS_MINUTES = [5, 15, 30] as const;

export type PairParams = {
  riskProfile: RiskProfile;
  riskPct: number; // % efetivo (do perfil ou personalizado)
  goalPct: number; // meta do dia SÓ deste par (0 = desligada)
  lossPct: number; // limite de perda do dia SÓ deste par (0 = desligado)
  direction: number; // 0 = compra e venda, 1 = só compra, 2 = só venda
  recovery: boolean;
  recoveryLevels: number;
  recoveryOpposite: boolean; // depois de perda, a próxima entrada vai na direção oposta
  rsiZone: number; // 0 = RSI 50-50 ... 9 = RSI 5-95
  rsiPeriod: number;
  rsiTf: number; // minutos (1, 5, 15, 30)
  breakout: boolean; // false = reversão (compra fundo, vende topo), true = rompimento
  pending: boolean; // true = ordem pendente, false = a mercado
  atr: boolean;
  adx: boolean;
  adxLevel: number;
  zones: boolean;
  zonesMode: number; // 0 = só com ADX, 1 = bloqueia contra a zona, 2 = só opera nas zonas
  breakEven: boolean;
  trailing: boolean;
};

// Padrão de cada par = os parâmetros que o Alesson deixou no robô (conta demo 74033338).
export const DEFAULT_PAIR: PairParams = {
  riskProfile: "moderate",
  riskPct: RISK_PROFILES.moderate,
  goalPct: 0,
  lossPct: 0,
  direction: 0,
  recovery: true,
  recoveryLevels: 10,
  recoveryOpposite: false,
  rsiZone: 0,
  rsiPeriod: 5,
  rsiTf: 5,
  breakout: false,
  pending: true,
  atr: true,
  adx: true,
  adxLevel: 20,
  zones: true,
  zonesMode: 2,
  breakEven: true,
  trailing: true,
};

export type RobotConfig = {
  symbols: string[];
  maxPositions: number;
  ddPct: number; // rebaixamento máximo (% do saldo) - 0 = desligado
  dailyGoalPct: number; // meta do dia somando todos os pares
  dailyLossPct: number;
  startHour: number;
  endHour: number;
  days: number[]; // 0 = domingo ... 6 = sábado
  newsFilter: boolean;
  newsMedium: boolean;
  newsBefore: number;
  newsAfter: number;
  newsClose: number; // 0 = nada, 1 = posições, 2 = pendentes, 3 = tudo
  pairs: Record<string, PairParams>;
  updatedAt: Date | null;
};

export const SYMBOL_LABEL: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  USDCHF: "USD/CHF",
  NZDUSD: "NZD/USD",
};
