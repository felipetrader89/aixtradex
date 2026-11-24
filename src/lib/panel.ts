// Posição do menu dos painéis (cliente e admin), escolhida por cada pessoa e guardada num cookie.
export const MENU_COOKIE = "aix_menu";
export type MenuPosition = "left" | "right" | "top";
export const parseMenuPosition = (value: string | undefined): MenuPosition =>
  value === "right" || value === "top" ? value : "left";
