import * as SQLite from 'expo-sqlite';
import {
  UserProfile,
  BalanceSnapshot,
  Envelope,
  LedgerEvent,
  LedgerEventType,
  PaymentStatus,
  PaymentTransaction,
} from '../../types';

export function roundAmount(val: number): number {
  return Math.round(val * 100) / 100;
}

export function generateId(prefix: string = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}_${uuid}` : uuid;
  }
  const randomStr = Math.random().toString(36).substring(2, 10);
  const timeStr = Date.now().toString(36);
  return prefix ? `${prefix}_${timeStr}_${randomStr}` : `${timeStr}_${randomStr}`;
}

export const db = SQLite.openDatabaseSync('mob.db');

export function initDatabase(): void {
  try {
    db.execSync('PRAGMA journal_mode = WAL;');
  } catch (e) {
    // Web VFS may not support WAL mode
  }
  try {
    db.execSync('PRAGMA foreign_keys = ON;');
  } catch (e) {
    // Foreign keys fallback
  }

  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      avatarUri TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS balance_snapshots (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      source TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS envelopes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      archetype TEXT DEFAULT 'SPEND',
      currentAmount REAL NOT NULL DEFAULT 0,
      allocatedAmount REAL DEFAULT 0,
      minimumAmount REAL,
      targetAmount REAL,
      maximumAmount REAL,
      icon TEXT,
      color TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ledger_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      sourceEnvelopeId TEXT,
      destinationEnvelopeId TEXT,
      paymentId TEXT,
      note TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      envelopeId TEXT NOT NULL,
      requestedAmount REAL NOT NULL,
      payeeVpa TEXT NOT NULL,
      payeeName TEXT,
      qrPayload TEXT,
      transactionRef TEXT NOT NULL,
      status TEXT NOT NULL,
      upiTxnId TEXT,
      approvalRefNo TEXT,
      responseCode TEXT,
      returnedAmount REAL,
      createdAt TEXT NOT NULL,
      completedAt TEXT
    );
  `);

  try {
    db.execSync('ALTER TABLE users ADD COLUMN avatarUri TEXT;');
  } catch (e) {
    // Column may already exist
  }

  try {
    db.execSync("ALTER TABLE envelopes ADD COLUMN archetype TEXT DEFAULT 'SPEND';");
  } catch (e) {
    // Column may already exist
  }

  try {
    db.execSync('ALTER TABLE envelopes ADD COLUMN allocatedAmount REAL DEFAULT 0;');
  } catch (e) {
    // Column may already exist
  }
}

// Ensure database tables exist upon module initialization
try {
  initDatabase();
} catch (e) {
  console.error('Failed to initialize database tables:', e);
}

// -------------------------------------------------------------
// User Profile Helpers
// -------------------------------------------------------------

export function getUserProfile(): UserProfile | null {
  const row = db.getFirstSync<{ id: string; username: string; avatarUri: string | null; createdAt: string }>(
    'SELECT id, username, avatarUri, createdAt FROM users LIMIT 1'
  );
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    avatarUri: row.avatarUri || undefined,
    createdAt: row.createdAt,
  };
}

export function saveUserProfile(username: string, avatarUri?: string): UserProfile {
  const existing = getUserProfile();
  const now = new Date().toISOString();
  const trimmedName = username.trim();
  const finalAvatar = avatarUri !== undefined ? avatarUri : existing?.avatarUri;

  if (existing) {
    db.runSync('UPDATE users SET username = ?, avatarUri = ? WHERE id = ?', [
      trimmedName,
      finalAvatar ?? null,
      existing.id,
    ]);
    return {
      ...existing,
      username: trimmedName,
      avatarUri: finalAvatar,
    };
  } else {
    const newUser: UserProfile = {
      id: generateId('user'),
      username: trimmedName,
      avatarUri: finalAvatar,
      createdAt: now,
    };
    db.runSync(
      'INSERT INTO users (id, username, avatarUri, createdAt) VALUES (?, ?, ?, ?)',
      [newUser.id, newUser.username, newUser.avatarUri ?? null, newUser.createdAt]
    );
    return newUser;
  }
}

export function updateUserAvatar(avatarUri: string): UserProfile {
  const existing = getUserProfile();
  if (!existing) {
    throw new Error('User profile not found');
  }
  db.runSync('UPDATE users SET avatarUri = ? WHERE id = ?', [avatarUri, existing.id]);
  return {
    ...existing,
    avatarUri,
  };
}

// -------------------------------------------------------------
// Envelopes Helpers
// -------------------------------------------------------------

interface EnvelopeRow {
  id: string;
  name: string;
  archetype?: string | null;
  currentAmount: number;
  allocatedAmount?: number | null;
  minimumAmount: number | null;
  targetAmount: number | null;
  maximumAmount: number | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: number;
}

function mapEnvelopeRow(row: EnvelopeRow): Envelope {
  const isReserve = row.archetype === 'RESERVE' || (!row.archetype && (
    row.name.toLowerCase().includes('rent') ||
    row.name.toLowerCase().includes('emergency') ||
    row.name.toLowerCase().includes('tax') ||
    row.name.toLowerCase().includes('emi') ||
    row.name.toLowerCase().includes('bill')
  ));
  return {
    id: row.id,
    name: row.name,
    archetype: isReserve ? 'RESERVE' : 'SPEND',
    currentAmount: Number(row.currentAmount),
    allocatedAmount: row.allocatedAmount !== null && row.allocatedAmount !== undefined
      ? Number(row.allocatedAmount)
      : (row.targetAmount !== null ? Number(row.targetAmount) : Number(row.currentAmount)),
    minimumAmount: row.minimumAmount !== null ? Number(row.minimumAmount) : undefined,
    targetAmount: row.targetAmount !== null ? Number(row.targetAmount) : undefined,
    maximumAmount: row.maximumAmount !== null ? Number(row.maximumAmount) : undefined,
    icon: row.icon || undefined,
    color: row.color || undefined,
    sortOrder: Number(row.sortOrder),
    isActive: Boolean(row.isActive),
  };
}

export function getEnvelopes(): Envelope[] {
  const rows = db.getAllSync<EnvelopeRow>(
    'SELECT id, name, archetype, currentAmount, allocatedAmount, minimumAmount, targetAmount, maximumAmount, icon, color, sortOrder, isActive FROM envelopes WHERE isActive = 1 ORDER BY sortOrder ASC'
  );
  return rows.map(mapEnvelopeRow);
}

export interface CreateEnvelopeInput {
  name: string;
  archetype?: 'SPEND' | 'RESERVE';
  currentAmount?: number;
  allocatedAmount?: number;
  minimumAmount?: number;
  targetAmount?: number;
  maximumAmount?: number;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function createEnvelope(input: CreateEnvelopeInput): Envelope {
  const id = generateId('env');
  const currentAmount = input.currentAmount ? roundAmount(input.currentAmount) : 0;
  const allocatedAmount = input.allocatedAmount !== undefined ? roundAmount(input.allocatedAmount) : (input.targetAmount !== undefined ? roundAmount(input.targetAmount) : currentAmount);
  const minimumAmount = input.minimumAmount !== undefined ? roundAmount(input.minimumAmount) : null;
  const targetAmount = input.targetAmount !== undefined ? roundAmount(input.targetAmount) : null;
  const maximumAmount = input.maximumAmount !== undefined ? roundAmount(input.maximumAmount) : null;
  const archetype = input.archetype ?? (
    input.name.toLowerCase().includes('rent') ||
    input.name.toLowerCase().includes('emergency') ||
    input.name.toLowerCase().includes('tax') ||
    input.name.toLowerCase().includes('emi') ||
    input.name.toLowerCase().includes('bill')
      ? 'RESERVE'
      : 'SPEND'
  );
  const icon = input.icon ?? 'folder';
  const color = input.color ?? '#4F46E5';

  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const maxOrder = db.getFirstSync<{ maxSort: number | null }>(
      'SELECT MAX(sortOrder) as maxSort FROM envelopes'
    );
    sortOrder = (maxOrder?.maxSort !== null && maxOrder?.maxSort !== undefined) ? maxOrder.maxSort + 1 : 0;
  }

  const isActive = input.isActive !== false ? 1 : 0;

  db.runSync(
    `INSERT INTO envelopes (id, name, archetype, currentAmount, allocatedAmount, minimumAmount, targetAmount, maximumAmount, icon, color, sortOrder, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      archetype,
      currentAmount,
      allocatedAmount,
      minimumAmount,
      targetAmount,
      maximumAmount,
      icon,
      color,
      sortOrder,
      isActive,
    ]
  );

  return {
    id,
    name: input.name.trim(),
    archetype,
    currentAmount,
    allocatedAmount,
    minimumAmount: minimumAmount !== null ? minimumAmount : undefined,
    targetAmount: targetAmount !== null ? targetAmount : undefined,
    maximumAmount: maximumAmount !== null ? maximumAmount : undefined,
    icon,
    color,
    sortOrder,
    isActive: Boolean(isActive),
  };
}

export function updateEnvelope(envelope: Partial<Envelope> & { id: string }): Envelope {
  const existing = db.getFirstSync<EnvelopeRow>(
    'SELECT * FROM envelopes WHERE id = ?',
    [envelope.id]
  );
  if (!existing) {
    throw new Error(`Envelope not found: ${envelope.id}`);
  }

  const name = envelope.name !== undefined ? envelope.name.trim() : existing.name;
  const archetype = envelope.archetype !== undefined ? envelope.archetype : (existing.archetype || 'SPEND');
  const currentAmount = envelope.currentAmount !== undefined ? roundAmount(envelope.currentAmount) : existing.currentAmount;
  const allocatedAmount = envelope.allocatedAmount !== undefined ? roundAmount(envelope.allocatedAmount) : (existing.allocatedAmount ?? existing.targetAmount ?? existing.currentAmount);
  const minimumAmount = envelope.minimumAmount !== undefined ? envelope.minimumAmount : existing.minimumAmount;
  const targetAmount = envelope.targetAmount !== undefined ? envelope.targetAmount : existing.targetAmount;
  const maximumAmount = envelope.maximumAmount !== undefined ? envelope.maximumAmount : existing.maximumAmount;
  const icon = envelope.icon !== undefined ? envelope.icon : existing.icon;
  const color = envelope.color !== undefined ? envelope.color : existing.color;
  const sortOrder = envelope.sortOrder !== undefined ? envelope.sortOrder : existing.sortOrder;
  const isActive = envelope.isActive !== undefined ? (envelope.isActive ? 1 : 0) : existing.isActive;

  db.runSync(
    `UPDATE envelopes
     SET name = ?, archetype = ?, currentAmount = ?, allocatedAmount = ?, minimumAmount = ?, targetAmount = ?, maximumAmount = ?, icon = ?, color = ?, sortOrder = ?, isActive = ?
     WHERE id = ?`,
    [
      name,
      archetype,
      currentAmount,
      allocatedAmount,
      minimumAmount ?? null,
      targetAmount ?? null,
      maximumAmount ?? null,
      icon ?? null,
      color ?? null,
      sortOrder,
      isActive,
      envelope.id,
    ]
  );

  return {
    id: envelope.id,
    name,
    archetype: archetype as 'SPEND' | 'RESERVE',
    currentAmount,
    allocatedAmount,
    minimumAmount: minimumAmount !== null && minimumAmount !== undefined ? minimumAmount : undefined,
    targetAmount: targetAmount !== null && targetAmount !== undefined ? targetAmount : undefined,
    maximumAmount: maximumAmount !== null && maximumAmount !== undefined ? maximumAmount : undefined,
    icon: icon || undefined,
    color: color || undefined,
    sortOrder,
    isActive: Boolean(isActive),
  };
}

export function deleteEnvelope(id: string, deleteActivity: boolean = false): void {
  const row = db.getFirstSync<EnvelopeRow>(
    'SELECT * FROM envelopes WHERE id = ?',
    [id]
  );
  if (!row) return;

  db.withTransactionSync(() => {
    // If the envelope had an allocated balance, record an adjustment event returning it to unallocated
    if (row.currentAmount > 0) {
      db.runSync(
        `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId('event'),
          'ADJUSTMENT',
          row.currentAmount,
          id,
          null,
          null,
          `Envelope "${row.name}" deleted; funds returned to unallocated`,
          new Date().toISOString(),
        ]
      );
    }

    if (deleteActivity) {
      // Delete all payment transactions and ledger events associated with this envelope
      db.runSync('DELETE FROM payment_transactions WHERE envelopeId = ?', [id]);
      db.runSync(
        'DELETE FROM ledger_events WHERE sourceEnvelopeId = ? OR destinationEnvelopeId = ?',
        [id, id]
      );
    }

    // Mark inactive and reset currentAmount to 0 to prevent ghost allocations
    db.runSync('UPDATE envelopes SET isActive = 0, currentAmount = 0 WHERE id = ?', [id]);
  });
}

// -------------------------------------------------------------
// Balance Snapshot & Starting Balance
// -------------------------------------------------------------

interface BalanceSnapshotRow {
  id: string;
  amount: number;
  source: string;
  createdAt: string;
}

export function getBalanceSnapshot(): BalanceSnapshot | null {
  const row = db.getFirstSync<BalanceSnapshotRow>(
    'SELECT id, amount, source, createdAt FROM balance_snapshots ORDER BY createdAt DESC LIMIT 1'
  );
  if (!row) return null;
  return {
    id: row.id,
    amount: Number(row.amount),
    source: row.source as 'USER_ENTERED' | 'MANUAL_ADJUSTMENT',
    createdAt: row.createdAt,
  };
}

export interface EnvelopeAllocationInput {
  name: string;
  amount: number;
  min?: number;
  target?: number;
  icon?: string;
  color?: string;
}

export function setStartingBalance(
  amount: number,
  allocations: EnvelopeAllocationInput[]
): { snapshot: BalanceSnapshot; envelopes: Envelope[] } {
  const roundedStartingAmount = roundAmount(amount);
  const now = new Date().toISOString();

  let createdSnapshot!: BalanceSnapshot;
  const createdEnvelopes: Envelope[] = [];

  db.withTransactionSync(() => {
    // Clean prior balance tracking data for fresh setup
    db.runSync('DELETE FROM envelopes');
    db.runSync('DELETE FROM balance_snapshots');
    db.runSync('DELETE FROM ledger_events');
    db.runSync('DELETE FROM payment_transactions');

    // 1. Create initial snapshot
    const snapshotId = generateId('snap');
    db.runSync(
      'INSERT INTO balance_snapshots (id, amount, source, createdAt) VALUES (?, ?, ?, ?)',
      [snapshotId, roundedStartingAmount, 'USER_ENTERED', now]
    );

    createdSnapshot = {
      id: snapshotId,
      amount: roundedStartingAmount,
      source: 'USER_ENTERED',
      createdAt: now,
    };

    // 2. Record INITIAL_BALANCE ledger event
    db.runSync(
      `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId('event'),
        'INITIAL_BALANCE',
        roundedStartingAmount,
        null,
        null,
        null,
        'Initial balance snapshot recorded',
        now,
      ]
    );

    // 3. Create envelopes and allocation ledger events
    allocations.forEach((alloc, index) => {
      const envId = generateId('env');
      const allocAmt = roundAmount(alloc.amount);
      const minAmt = alloc.min !== undefined ? roundAmount(alloc.min) : null;
      const targetAmt = alloc.target !== undefined ? roundAmount(alloc.target) : allocAmt;
      const icon = alloc.icon || 'folder';
      const color = alloc.color || '#4F46E5';
      const isReserve = alloc.name.toLowerCase().includes('rent') ||
        alloc.name.toLowerCase().includes('emergency') ||
        alloc.name.toLowerCase().includes('tax') ||
        alloc.name.toLowerCase().includes('emi') ||
        alloc.name.toLowerCase().includes('bill');
      const archetype = isReserve ? 'RESERVE' : 'SPEND';

      db.runSync(
        `INSERT INTO envelopes (id, name, archetype, currentAmount, allocatedAmount, minimumAmount, targetAmount, maximumAmount, icon, color, sortOrder, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          envId,
          alloc.name.trim(),
          archetype,
          allocAmt,
          allocAmt,
          minAmt,
          targetAmt,
          null,
          icon,
          color,
          index,
          1,
        ]
      );

      if (allocAmt > 0) {
        db.runSync(
          `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId('event'),
            'ALLOCATE_TO_ENVELOPE',
            allocAmt,
            null,
            envId,
            null,
            `Initial allocation to ${alloc.name.trim()}`,
            now,
          ]
        );
      }

      createdEnvelopes.push({
        id: envId,
        name: alloc.name.trim(),
        archetype,
        currentAmount: allocAmt,
        allocatedAmount: allocAmt,
        minimumAmount: minAmt !== null ? minAmt : undefined,
        targetAmount: targetAmt !== null ? targetAmt : undefined,
        maximumAmount: undefined,
        icon,
        color,
        sortOrder: index,
        isActive: true,
      });
    });
  });

  return { snapshot: createdSnapshot, envelopes: createdEnvelopes };
}

// -------------------------------------------------------------
// Unallocated Balance & Invariant
// -------------------------------------------------------------

export function getUnallocatedBalance(): number {
  const snapshot = getBalanceSnapshot();
  if (!snapshot) return 0;
  const envelopes = getEnvelopes();
  const totalAllocated = envelopes.reduce((sum, env) => sum + env.currentAmount, 0);
  const unallocated = roundAmount(snapshot.amount - totalAllocated);
  return Math.max(0, unallocated);
}

export function checkConservationInvariant(): {
  isValid: boolean;
  trackedBalance: number;
  allocatedBalance: number;
  unallocatedBalance: number;
  difference: number;
} {
  const snapshot = getBalanceSnapshot();
  const trackedBalance = snapshot ? snapshot.amount : 0;
  const envelopes = getEnvelopes();
  const allocatedBalance = envelopes.reduce((sum, env) => sum + env.currentAmount, 0);
  const unallocatedBalance = getUnallocatedBalance();
  const difference = roundAmount(Math.abs(trackedBalance - (allocatedBalance + unallocatedBalance)));

  return {
    isValid: difference < 0.01,
    trackedBalance,
    allocatedBalance,
    unallocatedBalance,
    difference,
  };
}

// -------------------------------------------------------------
// Money Management & Allocation
// -------------------------------------------------------------

export function addMoneyToUnallocated(amount: number): BalanceSnapshot {
  if (amount <= 0) {
    throw new Error('Amount to add must be positive');
  }
  const roundedAdded = roundAmount(amount);
  const now = new Date().toISOString();
  let newSnapshot!: BalanceSnapshot;

  db.withTransactionSync(() => {
    const current = getBalanceSnapshot();
    const currentTotal = current ? current.amount : 0;
    const newTotal = roundAmount(currentTotal + roundedAdded);

    const snapshotId = generateId('snap');
    db.runSync(
      'INSERT INTO balance_snapshots (id, amount, source, createdAt) VALUES (?, ?, ?, ?)',
      [snapshotId, newTotal, 'MANUAL_ADJUSTMENT', now]
    );

    newSnapshot = {
      id: snapshotId,
      amount: newTotal,
      source: 'MANUAL_ADJUSTMENT',
      createdAt: now,
    };

    db.runSync(
      `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId('event'),
        'MANUAL_MONEY_ADDED',
        roundedAdded,
        null,
        null,
        null,
        'Manual money added to unallocated balance',
        now,
      ]
    );
  });

  return newSnapshot;
}

export function allocateMoney(
  fromEnvelopeId: string | null,
  toEnvelopeId: string,
  amount: number
): void {
  if (amount <= 0) {
    throw new Error('Allocation amount must be greater than zero');
  }
  const roundedAmount = roundAmount(amount);
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    if (fromEnvelopeId === null) {
      // From Unallocated to Target Envelope
      const unallocated = getUnallocatedBalance();
      if (roundedAmount > unallocated) {
        throw new Error(
          `Insufficient unallocated balance (Available: ₹${unallocated}, Requested: ₹${roundedAmount})`
        );
      }

      const target = db.getFirstSync<EnvelopeRow>(
        'SELECT * FROM envelopes WHERE id = ? AND isActive = 1',
        [toEnvelopeId]
      );
      if (!target) {
        throw new Error(`Target envelope not found or inactive: ${toEnvelopeId}`);
      }

      db.runSync(
        'UPDATE envelopes SET currentAmount = currentAmount + ? WHERE id = ?',
        [roundedAmount, toEnvelopeId]
      );

      db.runSync(
        `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId('event'),
          'ALLOCATE_TO_ENVELOPE',
          roundedAmount,
          null,
          toEnvelopeId,
          null,
          `Allocated ₹${roundedAmount} from unallocated to ${target.name}`,
          now,
        ]
      );
    } else {
      // Move between envelopes
      const source = db.getFirstSync<EnvelopeRow>(
        'SELECT * FROM envelopes WHERE id = ? AND isActive = 1',
        [fromEnvelopeId]
      );
      if (!source) {
        throw new Error(`Source envelope not found or inactive: ${fromEnvelopeId}`);
      }
      if (source.currentAmount < roundedAmount) {
        throw new Error(
          `Insufficient funds in ${source.name} (Available: ₹${source.currentAmount}, Requested: ₹${roundedAmount})`
        );
      }

      const target = db.getFirstSync<EnvelopeRow>(
        'SELECT * FROM envelopes WHERE id = ? AND isActive = 1',
        [toEnvelopeId]
      );
      if (!target) {
        throw new Error(`Target envelope not found or inactive: ${toEnvelopeId}`);
      }

      db.runSync(
        'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
        [roundedAmount, fromEnvelopeId]
      );
      db.runSync(
        'UPDATE envelopes SET currentAmount = currentAmount + ? WHERE id = ?',
        [roundedAmount, toEnvelopeId]
      );

      db.runSync(
        `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId('event'),
          'MOVE_BETWEEN_ENVELOPES',
          roundedAmount,
          fromEnvelopeId,
          toEnvelopeId,
          null,
          `Transferred ₹${roundedAmount} from ${source.name} to ${target.name}`,
          now,
        ]
      );
    }
  });
}

// -------------------------------------------------------------
// Ledger Events & Payment Transactions
// -------------------------------------------------------------

interface LedgerEventRow {
  id: string;
  type: string;
  amount: number;
  sourceEnvelopeId: string | null;
  destinationEnvelopeId: string | null;
  paymentId: string | null;
  note: string | null;
  createdAt: string;
}

export function getLedgerEvents(): LedgerEvent[] {
  const rows = db.getAllSync<LedgerEventRow>(
    'SELECT id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt FROM ledger_events ORDER BY createdAt DESC'
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type as LedgerEventType,
    amount: Number(row.amount),
    sourceEnvelopeId: row.sourceEnvelopeId || undefined,
    destinationEnvelopeId: row.destinationEnvelopeId || undefined,
    paymentId: row.paymentId || undefined,
    note: row.note || undefined,
    createdAt: row.createdAt,
  }));
}

interface PaymentTransactionRow {
  id: string;
  envelopeId: string;
  requestedAmount: number;
  payeeVpa: string;
  payeeName: string | null;
  qrPayload: string | null;
  transactionRef: string;
  status: string;
  upiTxnId: string | null;
  approvalRefNo: string | null;
  responseCode: string | null;
  returnedAmount: number | null;
  createdAt: string;
  completedAt: string | null;
}

export function getPaymentTransactions(): PaymentTransaction[] {
  const rows = db.getAllSync<PaymentTransactionRow>(
    'SELECT id, envelopeId, requestedAmount, payeeVpa, payeeName, qrPayload, transactionRef, status, upiTxnId, approvalRefNo, responseCode, returnedAmount, createdAt, completedAt FROM payment_transactions ORDER BY createdAt DESC'
  );
  return rows.map((row) => ({
    id: row.id,
    envelopeId: row.envelopeId,
    requestedAmount: Number(row.requestedAmount),
    payeeVpa: row.payeeVpa,
    payeeName: row.payeeName || undefined,
    qrPayload: row.qrPayload || undefined,
    transactionRef: row.transactionRef,
    status: row.status as PaymentStatus,
    upiTxnId: row.upiTxnId || undefined,
    approvalRefNo: row.approvalRefNo || undefined,
    responseCode: row.responseCode || undefined,
    returnedAmount: row.returnedAmount !== null ? Number(row.returnedAmount) : undefined,
    createdAt: row.createdAt,
    completedAt: row.completedAt || undefined,
  }));
}

export function recordPayment(payment: PaymentTransaction): void {
  db.runSync(
    `INSERT INTO payment_transactions (
      id, envelopeId, requestedAmount, payeeVpa, payeeName,
      qrPayload, transactionRef, status, upiTxnId, approvalRefNo,
      responseCode, returnedAmount, createdAt, completedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payment.id,
      payment.envelopeId,
      roundAmount(payment.requestedAmount),
      payment.payeeVpa,
      payment.payeeName ?? null,
      payment.qrPayload ?? null,
      payment.transactionRef,
      payment.status,
      payment.upiTxnId ?? null,
      payment.approvalRefNo ?? null,
      payment.responseCode ?? null,
      payment.returnedAmount !== undefined ? roundAmount(payment.returnedAmount) : null,
      payment.createdAt,
      payment.completedAt ?? null,
    ]
  );
}

export function finalizePayment(
  paymentId: string,
  status: PaymentStatus,
  returnedDetails?: any
): PaymentTransaction {
  const paymentRow = db.getFirstSync<PaymentTransactionRow>(
    'SELECT * FROM payment_transactions WHERE id = ?',
    [paymentId]
  );
  if (!paymentRow) {
    throw new Error(`Payment transaction not found: ${paymentId}`);
  }

  const now = new Date().toISOString();
  const upiTxnId = returnedDetails?.txnId ?? returnedDetails?.upiTxnId ?? paymentRow.upiTxnId ?? null;
  const approvalRefNo = returnedDetails?.approvalRefNo ?? paymentRow.approvalRefNo ?? null;
  const responseCode = returnedDetails?.responseCode ?? paymentRow.responseCode ?? null;
  const returnedAmount = returnedDetails?.amount !== undefined
    ? Number(returnedDetails.amount)
    : returnedDetails?.returnedAmount !== undefined
    ? Number(returnedDetails.returnedAmount)
    : paymentRow.returnedAmount !== null
    ? Number(paymentRow.returnedAmount)
    : null;

  db.withTransactionSync(() => {
    // 1. Update the payment transaction record
    db.runSync(
      `UPDATE payment_transactions
       SET status = ?, upiTxnId = ?, approvalRefNo = ?, responseCode = ?, returnedAmount = ?, completedAt = ?
       WHERE id = ?`,
      [
        status,
        upiTxnId,
        approvalRefNo,
        responseCode,
        returnedAmount,
        now,
        paymentId,
      ]
    );

    // 2. ONLY deduct from envelope and snapshot on SUCCESS!
    if (status === 'SUCCESS') {
      const requestedAmt = Number(paymentRow.requestedAmount);

      // Deduct from envelope
      db.runSync(
        'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
        [requestedAmt, paymentRow.envelopeId]
      );

      // Deduct from tracked balance snapshot
      const currentSnapshot = getBalanceSnapshot();
      const currentAmt = currentSnapshot ? currentSnapshot.amount : 0;
      const newSnapshotAmt = roundAmount(Math.max(0, currentAmt - requestedAmt));

      db.runSync(
        'INSERT INTO balance_snapshots (id, amount, source, createdAt) VALUES (?, ?, ?, ?)',
        [generateId('snap'), newSnapshotAmt, 'MANUAL_ADJUSTMENT', now]
      );

      // Record PAYMENT_SUCCESS ledger event
      db.runSync(
        `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId('event'),
          'PAYMENT_SUCCESS',
          requestedAmt,
          paymentRow.envelopeId,
          null,
          paymentId,
          `Payment of ₹${requestedAmt} to ${paymentRow.payeeName || paymentRow.payeeVpa}`,
          now,
        ]
      );
    }
  });

  const updated = db.getFirstSync<PaymentTransactionRow>(
    'SELECT * FROM payment_transactions WHERE id = ?',
    [paymentId]
  );
  if (!updated) {
    throw new Error(`Failed to load updated payment transaction: ${paymentId}`);
  }

  return {
    id: updated.id,
    envelopeId: updated.envelopeId,
    requestedAmount: Number(updated.requestedAmount),
    payeeVpa: updated.payeeVpa,
    payeeName: updated.payeeName || undefined,
    qrPayload: updated.qrPayload || undefined,
    transactionRef: updated.transactionRef,
    status: updated.status as PaymentStatus,
    upiTxnId: updated.upiTxnId || undefined,
    approvalRefNo: updated.approvalRefNo || undefined,
    responseCode: updated.responseCode || undefined,
    returnedAmount: updated.returnedAmount !== null ? Number(updated.returnedAmount) : undefined,
    createdAt: updated.createdAt,
    completedAt: updated.completedAt || undefined,
  };
}

export function resetAllData(): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM users');
    db.runSync('DELETE FROM balance_snapshots');
    db.runSync('DELETE FROM envelopes');
    db.runSync('DELETE FROM ledger_events');
    db.runSync('DELETE FROM payment_transactions');
  });
}

export function resetBucketsAndActivity(): void {
  db.withTransactionSync(() => {
    // Clear all envelopes, payment transactions, and ledger events
    // Total tracked balance in balance_snapshots remains untouched, so all funds become unallocated
    db.runSync('DELETE FROM envelopes');
    db.runSync('DELETE FROM payment_transactions');
    db.runSync('DELETE FROM ledger_events');

    // Record a fresh adjustment event so ledger history reflects the reset
    const snapshot = getBalanceSnapshot();
    const currentAmt = snapshot ? snapshot.amount : 0;
    const now = new Date().toISOString();

    db.runSync(
      `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId('event'),
        'ADJUSTMENT',
        currentAmt,
        null,
        null,
        null,
        'Buckets and activity reset. All tracked funds moved to unallocated.',
        now,
      ]
    );
  });
}

export function recordManualSpend(
  envelopeId: string,
  amount: number,
  note?: string
): PaymentTransaction {
  const roundedAmt = roundAmount(amount);
  if (roundedAmt <= 0) {
    throw new Error('Amount must be greater than ₹0');
  }

  const envelope = db.getFirstSync<EnvelopeRow>(
    'SELECT * FROM envelopes WHERE id = ? AND isActive = 1',
    [envelopeId]
  );
  if (!envelope) {
    throw new Error(`Bucket not found or inactive: ${envelopeId}`);
  }

  if (envelope.currentAmount < roundedAmt) {
    throw new Error(
      `Insufficient balance in ${envelope.name}. Available: ₹${envelope.currentAmount}`
    );
  }

  const now = new Date().toISOString();
  const paymentId = generateId('manual_pay');
  const transactionRef = `MANUAL-${Date.now()}`;
  const payeeName = note?.trim() || 'Manual Spend';

  db.withTransactionSync(() => {
    // 1. Deduct from envelope currentAmount
    db.runSync(
      'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
      [roundedAmt, envelopeId]
    );

    // 2. Deduct from tracked balance snapshot
    const currentSnapshot = getBalanceSnapshot();
    const currentAmt = currentSnapshot ? currentSnapshot.amount : 0;
    const newSnapshotAmt = roundAmount(Math.max(0, currentAmt - roundedAmt));

    db.runSync(
      'INSERT INTO balance_snapshots (id, amount, source, createdAt) VALUES (?, ?, ?, ?)',
      [generateId('snap'), newSnapshotAmt, 'MANUAL_ADJUSTMENT', now]
    );

    // 3. Record transaction in payment_transactions
    db.runSync(
      `INSERT INTO payment_transactions (
        id, envelopeId, requestedAmount, payeeVpa, payeeName,
        qrPayload, transactionRef, status, upiTxnId, approvalRefNo,
        responseCode, returnedAmount, createdAt, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        envelopeId,
        roundedAmt,
        'manual@cash',
        payeeName,
        'MANUAL_OFFLINE_ENTRY',
        transactionRef,
        'SUCCESS',
        null,
        null,
        '00',
        roundedAmt,
        now,
        now,
      ]
    );

    // 4. Record ledger event
    db.runSync(
      `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId('event'),
        'PAYMENT_SUCCESS',
        roundedAmt,
        envelopeId,
        null,
        paymentId,
        `Manual spend: ${payeeName} (₹${roundedAmt})`,
        now,
      ]
    );
  });

  return {
    id: paymentId,
    envelopeId,
    requestedAmount: roundedAmt,
    payeeVpa: 'manual@cash',
    payeeName,
    qrPayload: 'MANUAL_OFFLINE_ENTRY',
    transactionRef,
    status: 'SUCCESS',
    returnedAmount: roundedAmt,
    createdAt: now,
    completedAt: now,
  };
}
