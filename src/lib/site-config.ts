export const siteConfig = {
  name: "Ai X TradeX",
  telegramUrl: "https://t.me/AiXTradeX",
  telegramDmUrl: "https://t.me/AlessonFelipe89",
  youtubeUrl: "https://www.youtube.com/@AiXTradeX",
  instagramUrl: "https://www.instagram.com/aixtradex",
  tiktokUrl: "https://www.tiktok.com/@aixtradex",
  facebookUrl: "https://www.facebook.com/aixtradex",
  brokers: ["FPMarkets", "Tickmill", "Vantage", "Exness"],
} as const;

// Corretoras parceiras (IB): quem abre conta pelo link ou muda o IB pro código abaixo ganha desconto na licença.
export const partnerBrokers = [
  {
    slug: "fpmarkets",
    name: "FPMarkets",
    link: "https://www.fpmarkets.com/switch-to-fp-markets/?redir=stv&fpm-affiliate-utm-source=IB&fpm-affiliate-agt=24824",
    ibCode: "24824",
  },
  {
    slug: "tickmill",
    name: "Tickmill",
    link: "https://my.tickmill.com/?utm_campaign=ib_link&utm_content=IB39326062&utm_medium=Open+Account&utm_source=link&lp=https%3A%2F%2Fmy.tickmill.com%2Fpt%2Fsign-up%2F",
    ibCode: "IB39326062",
  },
  {
    slug: "vantage",
    name: "Vantage",
    link: "https://vigco.co/la-com/AiXTradeX",
    ibCode: "16501104",
  },
  {
    slug: "exness",
    name: "Exness",
    link: "https://one.exnesstrack.org/a/216h8m56uq",
    ibCode: "1059221644995803943",
  },
] as const;

export const paymentAddresses = {
  binancePayId: "38373757",
  btc: "13YCPr7Pdkbp67jsQ3GfvbUZ9PUW6AaaLs",
  usdtTrc20: "TBafKQqxXdyTRvzCVMZY38j8nrZsUe4CFP",
  usdtErc20: "0x0edeb5c10fe25acc0c5324b9a929900df64712e8",
  usdtBep20: "0x0edeb5c10fe25acc0c5324b9a929900df64712e8",
  usdc: "0x0edeb5c10fe25acc0c5324b9a929900df64712e8",
  ltc: "LUV1T1ivaowrDYjmeZvEQneXzCrKXVg4bw",
  eth: "0x0edeb5c10fe25acc0c5324b9a929900df64712e8",
} as const;
