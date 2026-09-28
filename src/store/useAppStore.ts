import { create } from 'zustand';
import {
  UserProfile,
  Envelope,
  LedgerEvent,
  PaymentTransaction,
  PaymentStatus,
} from '../types';
import * as database from '../services/db/database';

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
  isLoading: boolean;

  // Actions
  loadInitialData: () => Promise<void>;
  completeOnboarding: (
    username: string,
    startingBalance: number,
    envelopeAllocations: EnvelopeAllocation[],
    avatarUri?: string
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
  const unallocatedBalance = database.getUnallocatedBalance();
  const trackedBalance = snapshot ? snapshot.amount : 0;
  const allocatedBalance = envelopes.reduce((sum, env) => sum + env.currentAmount, 0);
  const isInitialized = !!user && !!snapshot;

  return {
    user,
    envelopes,
    ledgerEvents,
    paymentTransactions,
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
    avatarUri?: string
  ) => {
    set({ isLoading: true });
    try {
      // 1. Save or update user profile
      database.saveUserProfile(username, avatarUri);

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
