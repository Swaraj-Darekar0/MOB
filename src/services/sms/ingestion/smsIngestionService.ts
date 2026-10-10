import {
  ParsedTransaction,
  Transaction,
  TransactionMessage,
  PaymentCorrelation,
  SystemCategory,
} from '../../../types';
import {
  insertTransaction,
  insertTransactionMessage,
  hasTransactionMessageHash,
  findMerchantRule,
  getPrimaryAccount,
  updateAccountBalances,
  updatePaymentAttempt,
  getPaymentAttemptById,
  db,
  getEnvelopes,
  roundAmount,
  generateId,
  getBalanceSnapshot,
} from '../../db/database';
import { parseSms } from '../parser';
import { computeMessageHash } from '../reconciliation/deduplicator';
import { classifyTransaction } from '../categorization/classifier';
import { correlatePaymentWithSms } from '../reconciliation/paymentCorrelator';
import { toRupees, toPaise, subPaise } from '../../../utils/money';

export interface IngestionResult {
  status: 'PROCESSED' | 'DUPLICATE' | 'NON_FINANCIAL' | 'ERROR';
  transaction?: Transaction;
  correlation?: PaymentCorrelation;
  reason?: string;
}

/**
 * Core Financial SMS Ingestion Engine
 * 
 * Ingests incoming SMS from real-time BroadcastReceiver or background inbox reader:
 * 1. Deduplicates against message hash
 * 2. Parses via deterministic bank-specific grammar
 * 3. Correlates with pending in-app payments (3-signal model)
 * 4. Categorizes via 7-tier lexical engine
 * 5. Updates local SQLite ledger and balance snapshots
 */
export function processIncomingSms(
  body: string,
  sender: string,
  timestamp: number = Date.now()
): IngestionResult {
  try {
    // 1. Deduplication Check
    const messageHash = computeMessageHash(sender, body, timestamp);
    if (hasTransactionMessageHash(messageHash)) {
      return { status: 'DUPLICATE', reason: 'MESSAGE_ALREADY_INGESTED' };
    }

    // 2. Parse SMS
    const parsedTx: ParsedTransaction | null = parseSms(body, sender, timestamp);
    if (!parsedTx) {
      return { status: 'NON_FINANCIAL', reason: 'REJECTED_OR_NON_BOOKABLE' };
    }

    const txId = generateId('tx');
    const primaryAccount = getPrimaryAccount();
    const nowIso = new Date().toISOString();

    // 3. Evaluate 3-Signal Payment Correlation with in-flight payments
    const correlation = correlatePaymentWithSms(parsedTx);
    let resolvedEnvelopeId: string | undefined = undefined;
    let resolvedCategoryId: SystemCategory = 'UNCLASSIFIED';
    let transactionSource: 'EXTERNAL_SMS' | 'IN_APP_PAYMENT' | 'MANUAL_ENTRY' = 'EXTERNAL_SMS';

    if (correlation && (correlation.confirmationState === 'CONFIRMED' || correlation.confirmationState === 'STRONG_MATCH')) {
      // Confirmed In-App Payment!
      const attempt = getPaymentAttemptById(correlation.paymentAttemptId);
      if (attempt) {
        resolvedEnvelopeId = attempt.envelopeId;
        transactionSource = 'IN_APP_PAYMENT';

        // Update payment attempt to SUCCESS
        updatePaymentAttempt(attempt.id, {
          status: 'SUCCESS',
          approvalRefNo: parsedTx.referenceId || attempt.approvalRefNo,
          upiTxnId: parsedTx.referenceId || attempt.upiTxnId,
        });

        // Deduct from mapped envelope and tracked balance in database
        const deductRupees = toRupees(parsedTx.amountPaise);
        db.withTransactionSync(() => {
          db.runSync(
            'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
            [deductRupees, attempt.envelopeId]
          );

          const snap = getBalanceSnapshot();
          if (snap) {
            const newTracked = roundAmount(Math.max(0, snap.amount - deductRupees));
            db.runSync(
              'INSERT INTO balance_snapshots (id, amount, source, createdAt) VALUES (?, ?, ?, ?)',
              [generateId('snap'), newTracked, 'SMS_REPORTED', nowIso]
            );
          }

          db.runSync(
            `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId('event'),
              'PAYMENT_SUCCESS',
              deductRupees,
              attempt.envelopeId,
              null,
              attempt.id,
              `SMS Confirmed: ${parsedTx.merchantName || 'UPI Payment'} (Ref: ${parsedTx.referenceId || 'N/A'})`,
              nowIso,
            ]
          );
        });
      }
    } else {
      // External Transaction: Run 7-Tier Lexical Categorization
      const classification = classifyTransaction({
        merchantName: parsedTx.merchantName,
        payeeVpa: parsedTx.payeeVpa,
        rawNarration: body,
        channel: parsedTx.channel,
        type: parsedTx.type,
        ruleLookup: (vpa, m) => findMerchantRule(vpa, m),
      });

      if (classification.categoryId) {
        resolvedCategoryId = classification.categoryId;
      }

      // Check if user has an existing envelope that matches this category name
      const envelopes = getEnvelopes();
      const matchingEnv = envelopes.find((e) => {
        const nameLower = e.name.toLowerCase();
        if (resolvedCategoryId === 'FOOD_DINING' && (nameLower.includes('food') || nameLower.includes('dining'))) return true;
        if (resolvedCategoryId === 'GROCERIES' && nameLower.includes('grocer')) return true;
        if (resolvedCategoryId === 'TRANSPORT' && (nameLower.includes('travel') || nameLower.includes('commute') || nameLower.includes('cab'))) return true;
        if (resolvedCategoryId === 'SHOPPING' && nameLower.includes('shop')) return true;
        if (resolvedCategoryId === 'BILLS_UTILITIES' && (nameLower.includes('bill') || nameLower.includes('util'))) return true;
        if (resolvedCategoryId === 'RENT_HOUSING' && nameLower.includes('rent')) return true;
        return false;
      });

      if (matchingEnv && parsedTx.type === 'EXPENSE') {
        resolvedEnvelopeId = matchingEnv.id;
        const deductRupees = toRupees(parsedTx.amountPaise);

        db.withTransactionSync(() => {
          db.runSync(
            'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
            [deductRupees, matchingEnv.id]
          );

          const snap = getBalanceSnapshot();
          if (snap) {
            const newTracked = roundAmount(Math.max(0, snap.amount - deductRupees));
            db.runSync(
              'INSERT INTO balance_snapshots (id, amount, source, createdAt) VALUES (?, ?, ?, ?)',
              [generateId('snap'), newTracked, 'SMS_REPORTED', nowIso]
            );
          }

          db.runSync(
            `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId('event'),
              'PAYMENT_SUCCESS',
              deductRupees,
              matchingEnv.id,
              null,
              null,
              `External SMS: ${parsedTx.merchantName || 'UPI'} (₹${deductRupees})`,
              nowIso,
            ]
          );
        });
      }
    }

    // 4. Save Structured Transaction Record
    const savedTx: Transaction = {
      id: txId,
      accountId: primaryAccount.id,
      type: parsedTx.type,
      amountPaise: parsedTx.amountPaise,
      currency: 'INR',
      merchantName: parsedTx.merchantName || undefined,
      payeeVpa: parsedTx.payeeVpa || undefined,
      rawNarration: body,
      categoryId: resolvedCategoryId,
      envelopeId: resolvedEnvelopeId,
      referenceId: parsedTx.referenceId || undefined,
      upiTxnId: parsedTx.referenceId || undefined,
      accountLast4: parsedTx.accountLast4 || undefined,
      balanceAfterPaise: parsedTx.balanceAfterPaise || undefined,
      bankName: parsedTx.bankName || primaryAccount.bankName,
      channel: parsedTx.channel,
      source: transactionSource,
      confidence: parsedTx.confidence,
      occurredAt: parsedTx.occurredAt || nowIso,
      createdAt: nowIso,
    };

    insertTransaction(savedTx);

    // 5. Save Transaction Message Hash
    const savedMsg: TransactionMessage = {
      id: generateId('msg'),
      transactionId: savedTx.id,
      sender,
      messageHash,
      receivedAt: nowIso,
      parserVersion: '1.0.0',
    };
    insertTransactionMessage(savedMsg);

    // 6. Update Account Tracked Balance & Bank Balance
    if (parsedTx.balanceAfterPaise) {
      updateAccountBalances(
        primaryAccount.id,
        primaryAccount.trackedBalancePaise,
        parsedTx.balanceAfterPaise
      );
    }

    return {
      status: 'PROCESSED',
      transaction: savedTx,
      correlation: correlation || undefined,
    };
  } catch (error: any) {
    console.error('[SMS Ingestion] Failed to process SMS:', error);
    return {
      status: 'ERROR',
      reason: error?.message || 'UNKNOWN_ERROR',
    };
  }
}
