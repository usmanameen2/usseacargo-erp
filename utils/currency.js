// AED (UAE Dirham) currency formatter — default currency

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatCurrencyExact = (amount) => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const AED_TO_USD = 0.2723; // 1 AED = ~0.2723 USD
const USD_TO_AED = 3.6725; // 1 USD = ~3.6725 AED

const convertUSDtoAED = (usdAmount) => Math.round(usdAmount * USD_TO_AED * 100) / 100;
const convertAEDtoUSD = (aedAmount) => Math.round(aedAmount * AED_TO_USD * 100) / 100;

module.exports = {
  formatCurrency,
  formatCurrencyExact,
  convertUSDtoAED,
  convertAEDtoUSD,
  USD_TO_AED,
  AED_TO_USD,
};
