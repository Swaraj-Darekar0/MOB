/**
 * Integer Money Utility (Paise Representation)
 * 
 * Rules:
 * - 1 Rupee = 100 Paise
 * - Money is always stored and calculated as integer paise (number) to prevent
 *   floating-point IEEE 754 precision errors (e.g. 0.1 + 0.2 !== 0.3).
 * - Floating point is ONLY permitted at display formatting boundaries.
 */

export type MoneyPaise = number;

/**
 * Converts a rupee number (e.g. 750.50) into integer paise (75050).
 */
export function toPaise(rupees: number): MoneyPaise {
  if (typeof rupees !== 'number' || isNaN(rupees)) {
    return 0;
  }
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise (e.g. 75050) into standard rupees (750.50).
 */
export function toRupees(paise: MoneyPaise): number {
  if (typeof paise !== 'number' || isNaN(paise)) {
    return 0;
  }
  return paise / 100;
}

/**
 * Formats integer paise into Indian Rupee localized currency string.
 * Example: 75050 paise -> "₹750.50", 100000 paise -> "₹1,000"
 */
export function formatPaise(paise: MoneyPaise, showDecimalsIfZero: boolean = false): string {
  const rupees = toRupees(paise);
  const hasDecimals = paise % 100 !== 0;

  if (hasDecimals || showDecimalsIfZero) {
    return `₹${rupees.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `₹${rupees.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Formats a raw number without currency symbol.
 */
export function formatPaisePlain(paise: MoneyPaise): string {
  const rupees = toRupees(paise);
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: paise % 100 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Safe addition of paise values.
 */
export function addPaise(...amounts: MoneyPaise[]): MoneyPaise {
  return amounts.reduce((sum, curr) => sum + (Math.round(curr) || 0), 0);
}

/**
 * Safe subtraction of paise values (a - b).
 */
export function subPaise(a: MoneyPaise, b: MoneyPaise): MoneyPaise {
  return (Math.round(a) || 0) - (Math.round(b) || 0);
}

/**
 * Rounds a number to an integer MoneyPaise.
 */
export function roundPaise(amount: number): MoneyPaise {
  return Math.round(amount) || 0;
}
