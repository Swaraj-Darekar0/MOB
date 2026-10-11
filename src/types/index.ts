import type { MoneyPaise } from '../utils/money';
export type { MoneyPaise };

export interface UserProfile {
  id: string;
  username: string;
  phoneNumber?: string;
  avatarUri?: string;
  createdAt: string;
}

export interface LocalProfile {
  id: string;
  phoneNumber: string;
  createdAt: string;
}

export interface BalanceSnapshot {
  id: string;
  amount: number; // Rupee value for existing components
  amountPaise?: MoneyPaise;
  source: 'USER_ENTERED' | 'MANUAL_ADJUSTMENT' | 'SMS_REPORTED';
  createdAt: string;
}

export type BucketArchetype = 'SPEND' | 'RESERVE' | 'GOAL';

export interface Envelope {
  id: string;
  name: string;
  archetype?: BucketArchetype;
  currentAmount: number; // Rupee value for UI
  currentBalancePaise?: MoneyPaise;
  allocatedAmount?: number;
  minimumAmount?: number;
  minimumPaise?: MoneyPaise;
  targetAmount?: number;
  targetPaise?: MoneyPaise;
  maximumAmount?: number;
  maximumPaise?: MoneyPaise;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  isUnallocated?: boolean;
}

export type LedgerEventType =
  | 'INITIAL_BALANCE'
  | 'MANUAL_MONEY_ADDED'
  | 'ALLOCATE_TO_ENVELOPE'
  | 'MOVE_BETWEEN_ENVELOPES'
  | 'PAYMENT_SUCCESS'
  | 'REFUND'
  | 'REVERSAL'
  | 'ADJUSTMENT';

export interface LedgerEvent {
  id: string;
  type: LedgerEventType;
  amount: number;
  amountPaise?: MoneyPaise;
  sourceEnvelopeId?: string;
  destinationEnvelopeId?: string;
  paymentId?: string;
  note?: string;
  createdAt: string;
}

export type PaymentStatus =
  | 'INITIATED'
  | 'SUBMITTED'
  | 'SUCCESS'
  | 'FAILURE'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface PaymentTransaction {
  id: string;
  envelopeId: string;
  requestedAmount: number;
  requestedAmountPaise?: MoneyPaise;
  payeeVpa: string;
  payeeName?: string;
  qrPayload?: string;
  transactionRef: string;
  status: PaymentStatus;
  upiTxnId?: string;
  approvalRefNo?: string;
  responseCode?: string;
  returnedAmount?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ParsedUPIQR {
  isValid: boolean;
  payeeVpa: string;
  payeeName?: string;
  amount?: number;
  amountPaise?: MoneyPaise;
  currency: string;
  transactionRef?: string;
  transactionNote?: string;
  merchantCode?: string;
  merchantId?: string;
  storeId?: string;
  terminalId?: string;
  rawPayload: string;
  isDynamic: boolean;
  error?: string;
}

export type UPIFailureCategory =
  | 'USER_CANCELLED'
  | 'LIMIT_EXCEEDED'
  | 'PIN_LOCKED'
  | 'DECLINED'
  | 'BANK_DOWNTIME'
  | 'VALIDATION_ERROR'
  | 'APP_SWITCHED_PENDING'
  | 'UNKNOWN_FAILURE';

export interface UPIFailureDetails {
  category: UPIFailureCategory;
  title: string;
  description: string;
  responseCode?: string;
  rawError?: string;
}

export interface VPAClassificationResult {
  isMerchant: boolean;
  type: 'P2M' | 'P2P';
  reason: string;
}

export interface NormalizedUPIResponse {
  status: PaymentStatus;
  txnId?: string;
  txnRef?: string;
  approvalRefNo?: string;
  responseCode?: string;
  toVpa?: string;
  amount?: number;
  rawResponse?: any;
  failureDetails?: UPIFailureDetails;
}

// -------------------------------------------------------------
// New Domain Models for SMS Ingestion, Ledger & Reconciliation
// -------------------------------------------------------------

export interface Account {
  id: string;
  displayName: string;
  bankName: string;
  accountLast4?: string;
  currency: string;
  source: 'SMS_REPORTED' | 'MANUAL_INITIAL_BALANCE';
  initialBalancePaise: MoneyPaise;
  trackedBalancePaise: MoneyPaise;
  lastReportedBalancePaise?: MoneyPaise;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER'
  | 'REFUND'
  | 'REVERSAL'
  | 'INVESTMENT'
  | 'BALANCE_UPDATE'
  | 'FAILED'
  | 'UPCOMING'
  | 'UNKNOWN';

export type TransactionChannel =
  | 'UPI'
  | 'CARD'
  | 'IMPS'
  | 'NEFT'
  | 'RTGS'
  | 'ATM'
  | 'BANK'
  | 'UNKNOWN';

export type TransactionSource =
  | 'SMS_AUTOMATIC'
  | 'EXTERNAL_SMS'
  | 'IN_APP_PAYMENT'
  | 'MANUAL_ENTRY';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amountPaise: MoneyPaise;
  currency: string;
  merchantName?: string;
  payeeVpa?: string;
  rawNarration?: string;
  categoryId?: string;
  envelopeId?: string;
  referenceId?: string;
  upiTxnId?: string;
  accountLast4?: string;
  balanceAfterPaise?: MoneyPaise;
  bankName?: string;
  channel: TransactionChannel;
  source: TransactionSource;
  confidence?: number;
  occurredAt: string;
  createdAt: string;
}

export interface TransactionMessage {
  id: string;
  transactionId: string;
  sender: string;
  messageHash: string;
  receivedAt: string;
  parserVersion: string;
}

export interface PaymentAttempt {
  id: string;
  envelopeId: string;
  requestedAmountPaise: MoneyPaise;
  payeeName?: string;
  payeeVpa: string;
  qrPayload?: string;
  transactionRef: string;
  upiTxnId?: string;
  approvalRefNo?: string;
  responseCode?: string;
  returnedAmountPaise?: MoneyPaise;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantRule {
  id: string;
  normalizedMerchant?: string;
  normalizedVpa?: string;
  categoryId: string;
  envelopeId?: string;
  source: 'USER_RULE' | 'SYSTEM_RULE';
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  matchType: 'EXACT' | 'CONTAINS' | 'REGEX' | 'PREFIX';
  categoryId: string;
  priority: number;
  enabled: boolean;
}

export type SenderTrust =
  | 'BANK'
  | 'KNOWN_FINANCIAL'
  | 'UNKNOWN'
  | 'UNTRUSTED';

export interface ParsedTransaction {
  amountPaise: MoneyPaise;
  type: TransactionType;
  merchantName: string | null;
  payeeVpa: string | null;
  referenceId: string | null;
  accountLast4: string | null;
  balanceAfterPaise: MoneyPaise | null;
  bankName: string | null;
  channel: TransactionChannel;
  occurredAt: string | null;
  sender: string;
  confidence: number;
}

export type SystemCategory =
  | 'FOOD_DINING'
  | 'GROCERIES'
  | 'TRANSPORT'
  | 'FUEL'
  | 'SHOPPING'
  | 'BILLS_UTILITIES'
  | 'RENT_HOUSING'
  | 'ENTERTAINMENT_SUBSCRIPTIONS'
  | 'TRAVEL'
  | 'HEALTHCARE'
  | 'EDUCATION'
  | 'EMI_DEBT'
  | 'INSURANCE'
  | 'PERSONAL_CARE'
  | 'FAMILY_GIFTS'
  | 'INVESTMENT_SAVINGS'
  | 'CASH_ATM'
  | 'BANK_FEES'
  | 'TRANSFER'
  | 'INCOME'
  | 'REFUND'
  | 'OTHER'
  | 'UNCLASSIFIED';

export type ClassificationReason =
  | 'USER_VPA_RULE'
  | 'USER_MERCHANT_RULE'
  | 'KNOWN_MERCHANT'
  | 'LEXICAL'
  | 'KEYWORD'
  | 'CHANNEL'
  | 'UNCLASSIFIED';

export interface ClassificationResult {
  categoryId: SystemCategory | null;
  confidence: number;
  reason: ClassificationReason;
}

export type ConfirmationState =
  | 'NO_MATCH'
  | 'POSSIBLE_MATCH'
  | 'STRONG_MATCH'
  | 'CONFIRMED';

export interface PaymentCorrelation {
  paymentAttemptId: string;
  smsTransactionId: string;
  matchedSignals: string[];
  score: number;
  confirmationState: ConfirmationState;
}

export interface BalanceReconciliationResult {
  isReconciled: boolean;
  trackedBalancePaise: MoneyPaise;
  latestReportedBalancePaise?: MoneyPaise;
  differencePaise: MoneyPaise;
  untrackedTransactionsCount: number;
  status: 'RECONCILED' | 'MISMATCH' | 'NO_REPORTED_BALANCE';
}

export type GoalCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Goal {
  id: string;
  name: string;
  targetAmountPaise: MoneyPaise;
  currentBalancePaise: MoneyPaise;
  cadence: GoalCadence;
  installmentAmountPaise: MoneyPaise;
  deadline: string; // ISO Date YYYY-MM-DD
  nextContributionDate: string; // ISO Date YYYY-MM-DD
  status: GoalStatus;
  envelopeId: string; // Linked dedicated Goal Bucket
  createdAt: string;
  updatedAt: string;
}

export interface GoalShortfall {
  id: string;
  goalId: string;
  dueDate: string;
  plannedAmountPaise: MoneyPaise;
  allocatedAmountPaise: MoneyPaise;
  shortfallAmountPaise: MoneyPaise;
  unallocatedAvailablePaise: MoneyPaise;
  resolved: boolean;
  createdAt: string;
}

export interface GoalAllocationResult {
  goalId: string;
  goalName: string;
  plannedPaise: MoneyPaise;
  allocatedPaise: MoneyPaise;
  shortfallPaise: MoneyPaise;
  isPartial: boolean;
  newNextDueDate: string;
}
