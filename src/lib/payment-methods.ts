import { paymentAddresses } from "@/lib/site-config";

// Formas de pagamento do checkout. O endereço e o liga/desliga de cada uma são editados no admin
// (Configurações → Carteiras); os valores abaixo são o padrão até alguém salvar lá.
// `auto` = pode ser confirmada sozinha pela leitura da Binance (stablecoin ou Binance Pay).
// `binance` = moeda/rede pra conferir se o endereço é mesmo um endereço de depósito da conta Binance conectada.
export const PAYMENT_METHODS = [
  { key: "binancePay", auto: true, binance: null, defaultValue: paymentAddresses.binancePayId },
  { key: "usdtTrc20", auto: true, binance: { coin: "USDT", network: "TRX" }, defaultValue: paymentAddresses.usdtTrc20 },
  { key: "usdtBep20", auto: true, binance: { coin: "USDT", network: "BSC" }, defaultValue: paymentAddresses.usdtBep20 },
  { key: "usdtErc20", auto: true, binance: { coin: "USDT", network: "ETH" }, defaultValue: paymentAddresses.usdtErc20 },
  { key: "usdc", auto: true, binance: { coin: "USDC", network: "BASE" }, defaultValue: paymentAddresses.usdc },
  { key: "btc", auto: false, binance: { coin: "BTC", network: "BTC" }, defaultValue: paymentAddresses.btc },
  { key: "eth", auto: false, binance: { coin: "ETH", network: "ETH" }, defaultValue: paymentAddresses.eth },
  { key: "ltc", auto: false, binance: { coin: "LTC", network: "LTC" }, defaultValue: paymentAddresses.ltc },
] as const;

export type MethodKey = (typeof PAYMENT_METHODS)[number]["key"];

// O que o navegador do cliente recebe: só as formas ligadas.
export type PublicPaymentMethod = { key: MethodKey; value: string; auto: boolean };

export const METHOD_LABELS: Record<MethodKey, string> = {
  binancePay: "Binance Pay (ID)",
  usdtTrc20: "USDT · TRC-20 (Tron)",
  usdtBep20: "USDT · BEP-20 (BNB Smart Chain)",
  usdtErc20: "USDT · ERC-20 (Ethereum)",
  usdc: "USDC · BASE",
  btc: "Bitcoin (BTC)",
  eth: "Ethereum (ETH)",
  ltc: "Litecoin (LTC)",
};
