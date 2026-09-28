export interface UserProfile {
  id: string;
  username: string;
  avatarUri?: string;
  createdAt: string;
}

export interface BalanceSnapshot {
  id: string;
  amount: number;
  source: 'USER_ENTERED' | 'MANUAL_ADJUSTMENT';
  createdAt: string;
}

export type BucketArchetype = 'SPEND' | 'RESERVE';

export interface Envelope {
  id: string;
  name: string;
  archetype?: BucketArchetype;
  currentAmount: number;
  allocatedAmount?: number;
  minimumAmount?: number;
  targetAmount?: number;
  maximumAmount?: number;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
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

