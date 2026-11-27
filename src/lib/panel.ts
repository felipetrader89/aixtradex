// Posição do menu dos painéis (cliente e admin), escolhida por cada pessoa e guardada num cookie.
export const MENU_COOKIE = "aix_menu";
export type MenuPosition = "left" | "right" | "top";
export const parseMenuPosition = (value: string | undefined): MenuPosition =>
  value === "right" || value === "top" ? value : "left";

// Conta MT4 escolhida no topo do painel do cliente (seletor de conta, estilo corretora).
export const ACCOUNT_COOKIE = "aix_acct";
// Conta demo pelo nome do servidor (Exness-Trial14, FPMarketsSC-Demo, ICMarkets-Demo02...); o resto é real.
export const isDemoServer = (server: string | null | undefined) => /demo|trial|contest|virtual|practice/i.test(server ?? "");
export const saveAccountChoice = (login: string) => {
  document.cookie = `${ACCOUNT_COOKIE}=${login}; path=/; max-age=31536000; samesite=lax`;
};
