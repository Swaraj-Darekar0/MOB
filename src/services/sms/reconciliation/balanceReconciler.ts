import { BalanceReconciliationResult, MoneyPaise, Transaction } from '../../../types';
import { subPaise } from '../../../utils/money';

/**
 * Balance Reconciler
 * 
 * Verifies consistency between:
 * 1. Application's virtual tracked balance
 * 2. Real bank balance as reported by the latest verified financial SMS
 * 
 * Invariants:
 * - Never silently moves money between envelopes to mask a mismatch.
 * - Explicitly highlights untracked debits or missing transaction alerts.
 */

export function reconcileBalance(
  trackedBalancePaise: MoneyPaise,
  latestReportedBalancePaise?: MoneyPaise,
  recentTransactions?: Transaction[]
): BalanceReconciliationResult {
  if (latestReportedBalancePaise === undefined || latestReportedBalancePaise === null) {
    return {
      isReconciled: true,
      trackedBalancePaise,
      latestReportedBalancePaise: undefined,
      differencePaise: 0,
      untrackedTransactionsCount: 0,
      status: 'NO_REPORTED_BALANCE',
    };
  }

  const differencePaise = subPaise(trackedBalancePaise, latestReportedBalancePaise);

  // Allow sub-10 paise float rounding tolerance
  if (Math.abs(differencePaise) <= 10) {
    return {
      isReconciled: true,
      trackedBalancePaise,
      latestReportedBalancePaise,
      differencePaise: 0,
      untrackedTransactionsCount: 0,
      status: 'RECONCILED',
    };
  }

  // Look for recent transactions that might account for the difference
  const matchingTxns = (recentTransactions || []).filter(
    (t) => Math.abs(t.amountPaise) === Math.abs(differencePaise)
  );

  return {
    isReconciled: false,
    trackedBalancePaise,
    latestReportedBalancePaise,
    differencePaise,
    untrackedTransactionsCount: matchingTxns.length,
    status: 'MISMATCH',
  };
}
