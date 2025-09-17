/**
 * Currency Configuration and Utilities
 * Centralized currency management for the financial module
 */

// Company-wide currency configuration (can be changed)
export const COMPANY_CURRENCY = 'BRL'; // Start with BRL, can change to USD later
export const COMPANY_LOCALE = 'pt-BR';

// Operation module currency (fixed - never changes)
export const OPERATION_CURRENCY = 'BRL';
export const OPERATION_LOCALE = 'pt-BR';

// Supported currencies
export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Currency locales mapping
const CURRENCY_LOCALES: Record<SupportedCurrency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/**
 * Format a value as currency
 * @param value - The numeric value to format
 * @param currency - The currency to use (defaults to company currency)
 * @param isOperation - If true, forces BRL formatting for operation module
 */
export function formatCurrency(
  value: number,
  currency: SupportedCurrency = COMPANY_CURRENCY as SupportedCurrency,
  isOperation = false
): string {
  const finalCurrency = isOperation ? OPERATION_CURRENCY : currency;
  const locale = CURRENCY_LOCALES[finalCurrency] || COMPANY_LOCALE;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: finalCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format currency for display with custom options
 */
export function formatCurrencyAdvanced(
  value: number,
  options: {
    currency?: SupportedCurrency;
    showSymbol?: boolean;
    decimals?: number;
    isOperation?: boolean;
  } = {}
): string {
  const {
    currency = COMPANY_CURRENCY as SupportedCurrency,
    showSymbol = true,
    decimals = 2,
    isOperation = false,
  } = options;

  const finalCurrency = isOperation ? OPERATION_CURRENCY : currency;
  const locale = CURRENCY_LOCALES[finalCurrency] || COMPANY_LOCALE;

  if (!showSymbol) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: finalCurrency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Parse a currency string back to number
 */
export function parseCurrency(value: string, currency: SupportedCurrency = COMPANY_CURRENCY as SupportedCurrency): number {
  // Remove currency symbols and spaces
  const cleanValue = value
    .replace(/[R$\s€£¥¢]/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Replace decimal comma with dot
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert amount between currencies (placeholder for actual exchange rate integration)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  exchangeRate?: number
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // In production, this would fetch real exchange rates
  // For now, using placeholder rates
  const rates: Record<string, number> = {
    'BRL-USD': 0.20,
    'USD-BRL': 5.00,
    'BRL-EUR': 0.18,
    'EUR-BRL': 5.50,
    'BRL-GBP': 0.16,
    'GBP-BRL': 6.25,
    'USD-EUR': 0.92,
    'EUR-USD': 1.09,
    'USD-GBP': 0.79,
    'GBP-USD': 1.27,
    'EUR-GBP': 0.86,
    'GBP-EUR': 1.16,
  };

  if (exchangeRate) {
    return amount * exchangeRate;
  }

  const rateKey = `${fromCurrency}-${toCurrency}`;
  const rate = rates[rateKey] || 1;
  
  return amount * rate;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  
  return symbols[currency] || currency;
}