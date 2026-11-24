import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en", "es"],
  // Idioma do navegador decide (pt/en/es); qualquer outro idioma cai em inglês (público 90% internacional).
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];
