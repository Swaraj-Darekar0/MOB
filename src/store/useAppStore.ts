import { create } from 'zustand';
import {
  UserProfile,
  Envelope,
  LedgerEvent,
  PaymentTransaction,
  PaymentStatus,
  Transaction,
  Account,
  MerchantRule,
  BalanceReconciliationResult,
  SystemCategory,
  Goal,
  GoalShortfall,
  GoalCadence,
  GoalAllocationResult,
  MoneyPaise,
} from '../types';
import * as database from '../services/db/database';
import { processIncomingSms, IngestionResult } from '../services/sms/ingestion/smsIngestionService';
import { readDeviceSmsInbox } from '../services/sms/native/smsReader';
import { liveSmsEngine } from '../services/sms/live/liveSmsEngine';
import { reconcileBalance } from '../services/sms/reconciliation/balanceReconciler';
import {
  createGoalWithDedicatedBucket,
  processScheduledGoalAllocations,
  moveMoneyToGoal,
} from '../services/goals/goalPlanner';
import { toPaise } from '../utils/money';

export interface EnvelopeAllocation {
  name: string;
  percentage: number;
  amount: number;
  target?: number;
  min?: number;
  icon?: string;
  color?: string;
}

export interface AppState {
  isInitialized: boolean;
  user: UserProfile | null;
  trackedBalance: number;
  allocatedBalance: number;
  unallocatedBalance: number;
  envelopes: Envelope[];
  ledgerEvents: LedgerEvent[];
  paymentTransactions: PaymentTransaction[];
  transactions: Transaction[];
  primaryAccount: Account | null;
  reconciliationResult: BalanceReconciliationResult | null;
  merchantRules: MerchantRule[];
  goals: Goal[];
  shortfalls: GoalShortfall[];
  isLoading: boolean;

  // Actions
  loadInitialData: () => Promise<void>;
  completeOnboarding: (
    username: string,
    startingBalance: number,
    envelopeAllocations: EnvelopeAllocation[],
    avatarUri?: string,
    phoneNumber?: string,
    source?: 'SMS_REPORTED' | 'MANUAL_INITIAL_BALANCE'
  ) => Promise<void>;
  updateProfileImage: (avatarUri: string) => Promise<void>;
  addMoney: (amount: number) => Promise<void>;
  allocateToEnvelope: (envelopeId: string, amount: number) => Promise<void>;
  transferBetweenEnvelopes: (fromId: string, toId: string, amount: number) => Promise<void>;
  createCustomEnvelope: (
    name: string,
    target?: number,
    min?: number,
    icon?: string,
    color?: string,
    archetype?: 'SPEND' | 'RESERVE',
    allocatedAmount?: number
  ) => Promise<Envelope>;
  deleteEnvelope: (id: string, deleteActivity?: boolean) => Promise<void>;
  recordManualSpend: (envelopeId: string, amount: number, note?: string) => Promise<PaymentTransaction>;
  recordPayment: (payment: PaymentTransaction) => Promise<void>;
  recordPaymentResult: (
    paymentId: string,
    status: PaymentStatus,
    responseDetails?: any
  ) => Promise<PaymentTransaction>;
  ingestSmsMessage: (body: string, sender: string, timestamp?: number) => Promise<IngestionResult>;
  syncLatestDeviceSms: (maxCount?: number) => Promise<{ processedCount: number; totalScanned: number }>;
  reconcileTrackedBalance: () => Promise<BalanceReconciliationResult>;
  teachMerchantRule: (
    targetVpaOrMerchant: string,
    envelopeId: string,
    categoryId: SystemCategory,
    isVpa?: boolean
  ) => Promise<MerchantRule>;
  unclassifiedTransactions: Transaction[];
  assignTransactionToBucket: (
    transactionId: string,
    envelopeId: string,
    categoryId?: SystemCategory,
    teachRule?: boolean
  ) => Promise<void>;
  createGoal: (params: {
    name: string;
    targetAmountPaise: MoneyPaise;
    deadline: string;
    cadence: GoalCadence;
    initialDepositPaise?: MoneyPaise;
  }) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  runScheduledGoalAllocations: () => Promise<{ allocations: GoalAllocationResult[]; shortfalls: GoalShortfall[] }>;
  recoverShortfall: (
    sourceEnvelopeId: string,
    destinationGoalId: string,
    amountPaise: MoneyPaise
  ) => Promise<void>;
  resetBucketsAndActivity: () => Promise<void>;
  resetDatabase: () => Promise<void>;
  verifyInvariant: () => {
    isValid: boolean;
    trackedBalance: number;
    allocatedBalance: number;
    unallocatedBalance: number;
    difference: number;
  };
}

function getUpdatedStoreState() {
  const user = database.getUserProfile();
  const snapshot = database.getBalanceSnapshot();
  const envelopes = database.getEnvelopes();
  const ledgerEvents = database.getLedgerEvents();
  const paymentTransactions = database.getPaymentTransactions();
  const transactions = database.getTransactions(50);
  const unclassifiedTransactions = database.getUnclassifiedTransactions();
  const primaryAccount = database.getPrimaryAccount();
  const merchantRules = database.getMerchantRules();
  const goals = database.getGoals();
  const shortfalls = database.getGoalShortfalls();
  const unallocatedBalance = database.getUnallocatedBalance();
  const trackedBalance = snapshot ? snapshot.amount : 0;
  const allocatedBalance = envelopes.reduce((sum, env) => sum + env.currentAmount, 0);
  const isInitialized = !!user && !!snapshot;

  const reconciliationResult = primaryAccount
    ? reconcileBalance(
        primaryAccount.trackedBalancePaise,
        primaryAccount.lastReportedBalancePaise,
        transactions
      )
    : null;

  return {
    user,
    envelopes,
    ledgerEvents,
    paymentTransactions,
    transactions,
    unclassifiedTransactions,
    primaryAccount,
    reconciliationResult,
    merchantRules,
    goals,
    shortfalls,
    unallocatedBalance,
    trackedBalance,
    allocatedBalance,
    isInitialized,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  user: null,
  trackedBalance: 0,
  allocatedBalance: 0,
  unallocatedBalance: 0,
  envelopes: [],
  ledgerEvents: [],
  paymentTransactions: [],
  transactions: [],
  unclassifiedTransactions: [],
  primaryAccount: null,
  reconciliationResult: null,
  merchantRules: [],
  goals: [],
  shortfalls: [],
  isLoading: false,

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      database.initDatabase();
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to load initial data from database:', error);
      throw error;
    }
  },

  completeOnboarding: async (
    username: string,
    startingBalance: number,
    envelopeAllocations: EnvelopeAllocation[],
    avatarUri?: string,
    phoneNumber?: string,
    source: 'SMS_REPORTED' | 'MANUAL_INITIAL_BALANCE' = 'MANUAL_INITIAL_BALANCE'
  ) => {
    set({ isLoading: true });
    try {
      const cleanAvatar = avatarUri && avatarUri.trim().length > 0 ? avatarUri.trim() : undefined;
      // 1. Save or update user profile
      database.saveUserProfile(username, cleanAvatar);

      if (phoneNumber) {
        database.saveLocalProfile(phoneNumber);
      }

      // Save primary bank account
      database.saveAccount({
        id: 'primary_acc',
        displayName: 'Primary Bank Account',
        bankName: 'Bank',
        currency: 'INR',
        source,
        initialBalancePaise: toPaise(startingBalance),
        trackedBalancePaise: toPaise(startingBalance),
        lastReportedBalancePaise: toPaise(startingBalance),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Immediately convert percentage allocations to fixed rupee amounts
      const allocations = envelopeAllocations.map((alloc) => {
        const calculatedAmount =
          alloc.amount !== undefined && alloc.amount > 0
            ? alloc.amount
            : database.roundAmount((startingBalance * (alloc.percentage || 0)) / 100);

        return {
          name: alloc.name,
          amount: calculatedAmount,
          min: alloc.min,
          target: alloc.target ?? calculatedAmount,
          icon: alloc.icon,
          color: alloc.color,
        };
      });

      // 3. Set starting balance in database and create fixed rupee envelopes
      database.setStartingBalance(startingBalance, allocations);

      // 4. Update reactive state
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  },

  updateProfileImage: async (avatarUri: string) => {
    set({ isLoading: true });
    try {
      database.updateUserAvatar(avatarUri);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to update profile image:', error);
      throw error;
    }
  },

  addMoney: async (amount: number) => {
    set({ isLoading: true });
    try {
      database.addMoneyToUnallocated(amount);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to add money:', error);
      throw error;
    }
  },

  allocateToEnvelope: async (envelopeId: string, amount: number) => {
    set({ isLoading: true });
    try {
      database.allocateMoney(null, envelopeId, amount);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to allocate to envelope:', error);
      throw error;
    }
  },

  transferBetweenEnvelopes: async (fromId: string, toId: string, amount: number) => {
    set({ isLoading: true });
    try {
      database.allocateMoney(fromId, toId, amount);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to transfer between envelopes:', error);
      throw error;
    }
  },

  createCustomEnvelope: async (
    name: string,
    target?: number,
    min?: number,
    icon?: string,
    color?: string,
    archetype?: 'SPEND' | 'RESERVE',
    allocatedAmount?: number
  ) => {
    set({ isLoading: true });
    try {
      const created = database.createEnvelope({
        name,
        targetAmount: target,
        minimumAmount: min,
        icon,
        color,
        archetype,
        allocatedAmount,
      });
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
      return created;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to create custom envelope:', error);
      throw error;
    }
  },

  deleteEnvelope: async (id: string, deleteActivity: boolean = false) => {
    set({ isLoading: true });
    try {
      database.deleteEnvelope(id, deleteActivity);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to delete envelope:', error);
      throw error;
    }
  },

  recordManualSpend: async (envelopeId: string, amount: number, note?: string) => {
    set({ isLoading: true });
    try {
      const createdTxn = database.recordManualSpend(envelopeId, amount, note);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
      return createdTxn;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to record manual spend:', error);
      throw error;
    }
  },

  recordPayment: async (payment: PaymentTransaction) => {
    set({ isLoading: true });
    try {
      database.recordPayment(payment);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to record payment transaction:', error);
      throw error;
    }
  },

  recordPaymentResult: async (
    paymentId: string,
    status: PaymentStatus,
    responseDetails?: any
  ) => {
    set({ isLoading: true });
    try {
      const updatedPayment = database.finalizePayment(paymentId, status, responseDetails);
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
      return updatedPayment;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to record payment result:', error);
      throw error;
    }
  },

  ingestSmsMessage: async (body: string, sender: string, timestamp?: number) => {
    const result = processIncomingSms(body, sender, timestamp);
    const updated = getUpdatedStoreState();
    set({ ...updated });
    return result;
  },

  syncLatestDeviceSms: async (maxCount: number = 50) => {
    const result = await liveSmsEngine.pollNow();
    return { processedCount: result.processedCount, totalScanned: result.scannedCount };
  },

  reconcileTrackedBalance: async () => {
    const primary = database.getPrimaryAccount();
    const result = reconcileBalance(
      primary.trackedBalancePaise,
      primary.lastReportedBalancePaise,
      get().transactions
    );
    set({ reconciliationResult: result });
    return result;
  },

  teachMerchantRule: async (
    targetVpaOrMerchant: string,
    envelopeId: string,
    categoryId: SystemCategory,
    isVpa: boolean = false
  ) => {
    const rule = database.saveMerchantRule({
      normalizedVpa: isVpa ? targetVpaOrMerchant.toLowerCase().trim() : undefined,
      normalizedMerchant: !isVpa ? targetVpaOrMerchant.toLowerCase().trim() : undefined,
      categoryId,
      envelopeId,
      source: 'USER_RULE',
      priority: 10,
    });
    const updated = getUpdatedStoreState();
    set({ ...updated });
    return rule;
  },

  assignTransactionToBucket: async (
    transactionId: string,
    envelopeId: string,
    categoryId?: SystemCategory,
    teachRule: boolean = true
  ) => {
    const tx = database.getTransactionById(transactionId);
    const effectiveCategory: SystemCategory =
      categoryId && categoryId !== 'UNCLASSIFIED'
        ? categoryId
        : tx?.categoryId && tx.categoryId !== 'UNCLASSIFIED'
        ? (tx.categoryId as SystemCategory)
        : 'OTHER';

    database.updateTransactionEnvelope(
      transactionId,
      envelopeId,
      effectiveCategory
    );

    if (teachRule && tx) {
      const identifier = tx.payeeVpa || tx.merchantName;
      if (identifier) {
        database.saveMerchantRule({
          normalizedVpa: tx.payeeVpa ? tx.payeeVpa.toLowerCase().trim() : undefined,
          normalizedMerchant: tx.merchantName ? tx.merchantName.toLowerCase().trim() : undefined,
          categoryId: effectiveCategory,
          envelopeId,
          source: 'USER_RULE',
          priority: 10,
        });
      }
    }

    const updated = getUpdatedStoreState();
    set({ ...updated });
  },

  createGoal: async (params) => {
    set({ isLoading: true });
    try {
      const goal = createGoalWithDedicatedBucket(params);
      const updated = getUpdatedStoreState();
      set({ ...updated, isLoading: false });
      return goal;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to create goal:', error);
      throw error;
    }
  },

  updateGoal: async (id, updates) => {
    try {
      database.updateGoal(id, updates);
      const updated = getUpdatedStoreState();
      set(updated);
    } catch (error) {
      console.error('Failed to update goal:', error);
      throw error;
    }
  },

  deleteGoal: async (id) => {
    set({ isLoading: true });
    try {
      database.deleteGoal(id);
      const updated = getUpdatedStoreState();
      set({ ...updated, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to delete goal:', error);
      throw error;
    }
  },

  runScheduledGoalAllocations: async () => {
    try {
      const result = processScheduledGoalAllocations();
      const updated = getUpdatedStoreState();
      set(updated);
      return result;
    } catch (error) {
      console.error('Failed to process scheduled goal allocations:', error);
      throw error;
    }
  },

  recoverShortfall: async (sourceEnvelopeId, destinationGoalId, amountPaise) => {
    set({ isLoading: true });
    try {
      moveMoneyToGoal(sourceEnvelopeId, destinationGoalId, amountPaise);
      const updated = getUpdatedStoreState();
      set({ ...updated, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to recover shortfall:', error);
      throw error;
    }
  },

  resetBucketsAndActivity: async () => {
    set({ isLoading: true });
    try {
      database.resetBucketsAndActivity();
      const updated = getUpdatedStoreState();
      set({
        ...updated,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to reset buckets and activity:', error);
      throw error;
    }
  },

  resetDatabase: async () => {
    set({ isLoading: true });
    try {
      database.resetAllData();
      set({
        isInitialized: false,
        user: null,
        trackedBalance: 0,
        allocatedBalance: 0,
        unallocatedBalance: 0,
        envelopes: [],
        ledgerEvents: [],
        paymentTransactions: [],
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to reset database:', error);
      throw error;
    }
  },

  verifyInvariant: () => {
    return database.checkConservationInvariant();
  },
}));
