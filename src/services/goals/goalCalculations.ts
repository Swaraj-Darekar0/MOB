import { GoalCadence, MoneyPaise } from '../../types';

/**
 * Calculates the required installment amount in integer paise.
 * Invariant: Divides strictly in integer paise, never producing fractions.
 */
export function calculateInstallmentAmount(
  targetPaise: MoneyPaise,
  currentPaise: MoneyPaise,
  deadlineStr: string,
  cadence: GoalCadence,
  fromDateStr: string = new Date().toISOString().split('T')[0]
): MoneyPaise {
  const remainingPaise = Math.max(0, targetPaise - currentPaise);
  if (remainingPaise === 0) return 0;

  const fromDate = new Date(fromDateStr);
  const deadline = new Date(deadlineStr);
  const diffMs = deadline.getTime() - fromDate.getTime();
  const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let intervals = 1;
  switch (cadence) {
    case 'DAILY':
      intervals = Math.max(1, diffDays);
      break;
    case 'WEEKLY':
      intervals = Math.max(1, Math.ceil(diffDays / 7));
      break;
    case 'MONTHLY':
      intervals = Math.max(1, Math.ceil(diffDays / 30));
      break;
  }

  return Math.ceil(remainingPaise / intervals);
}

/**
 * Advances a due date by one cadence interval (exact calendar arithmetic).
 */
export function advanceNextDueDate(currentDateStr: string, cadence: GoalCadence): string {
  const date = new Date(currentDateStr);
  switch (cadence) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'MONTHLY': {
      const currentMonth = date.getMonth();
      date.setMonth(currentMonth + 1);
      break;
    }
  }
  return date.toISOString().split('T')[0];
}
