export const siteConfig = {
  name: "Ai X TradeX",
  telegramUrl: "https://t.me/AiXTradeX",
  telegramDmUrl: "https://t.me/AlessonFelipe89",
  brokers: ["FPMarkets", "Tickmill", "Vantage", "Exness"],
} as const;

// TODO: replace every placeholder below with the real payment destination
// before this goes live. Wrong crypto addresses cause irreversible fund loss.
export const paymentAddresses = {
  binancePayId: "TODO_BINANCE_PAY_ID",
  btc: "TODO_BTC_ADDRESS",
  usdtTrc20: "TODO_USDT_TRC20_ADDRESS",
  usdtErc20: "TODO_USDT_ERC20_ADDRESS",
  usdtBep20: "TODO_USDT_BEP20_ADDRESS",
  usdc: "TODO_USDC_ADDRESS",
  ltc: "TODO_LTC_ADDRESS",
  eth: "TODO_ETH_ADDRESS",
} as const;
