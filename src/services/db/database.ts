import * as SQLite from 'expo-sqlite';
import {
  UserProfile,
  LocalProfile,
  BalanceSnapshot,
  Envelope,
  LedgerEvent,
  LedgerEventType,
  PaymentStatus,
  PaymentTransaction,
  Account,
  Transaction,
  TransactionMessage,
  PaymentAttempt,
  MerchantRule,
  CategoryRule,
  MoneyPaise,
  Goal,
  GoalShortfall,
  GoalCadence,
  GoalStatus,
  BucketArchetype,
} from '../../types';
import { toPaise, toRupees } from '../../utils/money';

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
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_last4 TEXT,
      currency TEXT DEFAULT 'INR',
      source TEXT NOT NULL,
      initial_balance_paise INTEGER NOT NULL,
      tracked_balance_paise INTEGER NOT NULL,
      last_reported_balance_paise INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      merchant_name TEXT,
      payee_vpa TEXT,
      raw_narration TEXT,
      category_id TEXT,
      envelope_id TEXT,
      reference_id TEXT,
      upi_txn_id TEXT,
      account_last4 TEXT,
      balance_after_paise INTEGER,
      bank_name TEXT,
      channel TEXT NOT NULL,
      source TEXT NOT NULL,
      confidence REAL,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_messages (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      message_hash TEXT NOT NULL UNIQUE,
      received_at TEXT NOT NULL,
      parser_version TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_attempts (
      id TEXT PRIMARY KEY,
      envelope_id TEXT NOT NULL,
      requested_amount_paise INTEGER NOT NULL,
      payee_name TEXT,
      payee_vpa TEXT NOT NULL,
      qr_payload TEXT,
      transaction_ref TEXT NOT NULL,
      upi_txn_id TEXT,
      approval_ref_no TEXT,
      response_code TEXT,
      returned_amount_paise INTEGER,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS merchant_rules (
      id TEXT PRIMARY KEY,
      normalized_merchant TEXT,
      normalized_vpa TEXT,
      category_id TEXT NOT NULL,
      envelope_id TEXT,
      source TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL,
      match_type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount_paise INTEGER NOT NULL,
      current_balance_paise INTEGER NOT NULL DEFAULT 0,
      cadence TEXT NOT NULL,
      installment_amount_paise INTEGER NOT NULL,
      deadline TEXT NOT NULL,
      next_contribution_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      envelope_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goal_shortfalls (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      planned_amount_paise INTEGER NOT NULL,
      allocated_amount_paise INTEGER NOT NULL,
      shortfall_amount_paise INTEGER NOT NULL,
      unallocated_available_paise INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_occurred ON transactions(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(reference_id);
    CREATE INDEX IF NOT EXISTS idx_messages_hash ON transaction_messages(message_hash);
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_ref ON payment_attempts(transaction_ref);
    CREATE INDEX IF NOT EXISTS idx_merchant_rules_vpa ON merchant_rules(normalized_vpa);
    CREATE INDEX IF NOT EXISTS idx_merchant_rules_merchant ON merchant_rules(normalized_merchant);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
    CREATE INDEX IF NOT EXISTS idx_goals_next_date ON goals(next_contribution_date);
    CREATE INDEX IF NOT EXISTS idx_shortfalls_goal ON goal_shortfalls(goal_id);
  `);

  try {
    db.execSync('ALTER TABLE users ADD COLUMN phoneNumber TEXT;');
  } catch (e) {
    // Column may already exist
  }

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

  try {
    db.execSync('ALTER TABLE envelopes ADD COLUMN isUnallocated INTEGER DEFAULT 0;');
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
  const cleanAvatar = row.avatarUri && row.avatarUri.trim().length > 0 ? row.avatarUri.trim() : undefined;
  return {
    id: row.id,
    username: row.username,
    avatarUri: cleanAvatar,
    createdAt: row.createdAt,
  };
}

export function saveUserProfile(username: string, avatarUri?: string): UserProfile {
  const existing = getUserProfile();
  const now = new Date().toISOString();
  const trimmedName = username.trim();
  const cleanAvatar = avatarUri && avatarUri.trim().length > 0 ? avatarUri.trim() : undefined;
  const finalAvatar = cleanAvatar !== undefined ? cleanAvatar : (existing?.avatarUri || undefined);

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
  const cleanAvatar = avatarUri && avatarUri.trim().length > 0 ? avatarUri.trim() : undefined;
  db.runSync('UPDATE users SET avatarUri = ? WHERE id = ?', [cleanAvatar ?? null, existing.id]);
  return {
    ...existing,
    avatarUri: cleanAvatar,
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
  archetype?: BucketArchetype;
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

// -------------------------------------------------------------
// Local Profile (Phone Profile) Helpers
// -------------------------------------------------------------

export function getLocalProfile(): LocalProfile | null {
  const row = db.getFirstSync<{ id: string; phone_number: string; created_at: string }>(
    'SELECT id, phone_number, created_at FROM profile LIMIT 1'
  );
  if (!row) return null;
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
  };
}

export function saveLocalProfile(phoneNumber: string): LocalProfile {
  const existing = getLocalProfile();
  const now = new Date().toISOString();
  const cleanedPhone = phoneNumber.trim();

  if (existing) {
    db.runSync(
      'UPDATE profile SET phone_number = ?, updated_at = ? WHERE id = ?',
      [cleanedPhone, now, existing.id]
    );
    try {
      db.runSync('UPDATE users SET phoneNumber = ?', [cleanedPhone]);
    } catch {
      // ignore
    }
    return {
      ...existing,
      phoneNumber: cleanedPhone,
    };
  } else {
    const newProfile: LocalProfile = {
      id: generateId('profile'),
      phoneNumber: cleanedPhone,
      createdAt: now,
    };
    db.runSync(
      'INSERT INTO profile (id, phone_number, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [newProfile.id, newProfile.phoneNumber, newProfile.createdAt, now]
    );
    try {
      db.runSync('UPDATE users SET phoneNumber = ?', [cleanedPhone]);
    } catch {
      // ignore
    }
    return newProfile;
  }
}

// -------------------------------------------------------------
// Accounts Helpers (Multi-Bank Account Tracking)
// -------------------------------------------------------------

export function getAccount(id?: string): Account | null {
  const query = id
    ? 'SELECT * FROM accounts WHERE id = ? LIMIT 1'
    : 'SELECT * FROM accounts ORDER BY created_at ASC LIMIT 1';
  const params = id ? [id] : [];
  const row = db.getFirstSync<any>(query, params);
  if (!row) return null;

  return {
    id: row.id,
    displayName: row.display_name,
    bankName: row.bank_name,
    accountLast4: row.account_last4 || undefined,
    currency: row.currency || 'INR',
    source: row.source,
    initialBalancePaise: row.initial_balance_paise,
    trackedBalancePaise: row.tracked_balance_paise,
    lastReportedBalancePaise: row.last_reported_balance_paise ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getPrimaryAccount(): Account {
  const existing = getAccount();
  if (existing) return existing;

  // Fallback: create default primary account from balance snapshot if available
  const snapshot = getBalanceSnapshot();
  const initialPaise = snapshot ? toPaise(snapshot.amount) : 0;
  const now = new Date().toISOString();
  const newAccount: Account = {
    id: 'primary_acc',
    displayName: 'Primary Bank Account',
    bankName: 'Bank',
    currency: 'INR',
    source: 'MANUAL_INITIAL_BALANCE',
    initialBalancePaise: initialPaise,
    trackedBalancePaise: initialPaise,
    lastReportedBalancePaise: initialPaise,
    createdAt: now,
    updatedAt: now,
  };
  saveAccount(newAccount);
  return newAccount;
}

export function saveAccount(account: Account): Account {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO accounts (
      id, display_name, bank_name, account_last4, currency,
      source, initial_balance_paise, tracked_balance_paise,
      last_reported_balance_paise, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id,
      account.displayName,
      account.bankName,
      account.accountLast4 || null,
      account.currency || 'INR',
      account.source,
      account.initialBalancePaise,
      account.trackedBalancePaise,
      account.lastReportedBalancePaise ?? null,
      account.createdAt || now,
      now,
    ]
  );
  return account;
}

export function updateAccountBalances(
  id: string,
  trackedBalancePaise: MoneyPaise,
  lastReportedBalancePaise?: MoneyPaise
): void {
  const now = new Date().toISOString();
  if (lastReportedBalancePaise !== undefined) {
    db.runSync(
      `UPDATE accounts SET tracked_balance_paise = ?, last_reported_balance_paise = ?, updated_at = ? WHERE id = ?`,
      [trackedBalancePaise, lastReportedBalancePaise, now, id]
    );
  } else {
    db.runSync(
      `UPDATE accounts SET tracked_balance_paise = ?, updated_at = ? WHERE id = ?`,
      [trackedBalancePaise, now, id]
    );
  }
}

// -------------------------------------------------------------
// Transactions Helpers (Unified Financial Ledger)
// -------------------------------------------------------------

export function insertTransaction(tx: Transaction): Transaction {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO transactions (
      id, account_id, type, amount_paise, currency,
      merchant_name, payee_vpa, raw_narration, category_id,
      envelope_id, reference_id, upi_txn_id, account_last4,
      balance_after_paise, bank_name, channel, source,
      confidence, occurred_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.accountId,
      tx.type,
      tx.amountPaise,
      tx.currency || 'INR',
      tx.merchantName || null,
      tx.payeeVpa || null,
      tx.rawNarration || null,
      tx.categoryId || null,
      tx.envelopeId || null,
      tx.referenceId || null,
      tx.upiTxnId || null,
      tx.accountLast4 || null,
      tx.balanceAfterPaise ?? null,
      tx.bankName || null,
      tx.channel,
      tx.source,
      tx.confidence ?? null,
      tx.occurredAt || now,
      tx.createdAt || now,
    ]
  );
  return tx;
}

export function getTransactions(limit: number = 50): Transaction[] {
  const rows = db.getAllSync<any>(
    'SELECT * FROM transactions ORDER BY occurred_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    type: r.type,
    amountPaise: r.amount_paise,
    currency: r.currency,
    merchantName: r.merchant_name || undefined,
    payeeVpa: r.payee_vpa || undefined,
    rawNarration: r.raw_narration || undefined,
    categoryId: r.category_id || undefined,
    envelopeId: r.envelope_id || undefined,
    referenceId: r.reference_id || undefined,
    upiTxnId: r.upi_txn_id || undefined,
    accountLast4: r.account_last4 || undefined,
    balanceAfterPaise: r.balance_after_paise ?? undefined,
    bankName: r.bank_name || undefined,
    channel: r.channel,
    source: r.source,
    confidence: r.confidence ?? undefined,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  }));
}

export function getTransactionById(id: string): Transaction | null {
  const r = db.getFirstSync<any>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!r) return null;
  return {
    id: r.id,
    accountId: r.account_id,
    type: r.type,
    amountPaise: r.amount_paise,
    currency: r.currency,
    merchantName: r.merchant_name || undefined,
    payeeVpa: r.payee_vpa || undefined,
    rawNarration: r.raw_narration || undefined,
    categoryId: r.category_id || undefined,
    envelopeId: r.envelope_id || undefined,
    referenceId: r.reference_id || undefined,
    upiTxnId: r.upi_txn_id || undefined,
    accountLast4: r.account_last4 || undefined,
    balanceAfterPaise: r.balance_after_paise ?? undefined,
    bankName: r.bank_name || undefined,
    channel: r.channel,
    source: r.source,
    confidence: r.confidence ?? undefined,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  };
}

export function findTransactionByReference(refId: string): Transaction | null {
  if (!refId || !db) return null;
  const r = db.getFirstSync<any>(
    'SELECT * FROM transactions WHERE reference_id = ? OR upi_txn_id = ? LIMIT 1',
    [refId, refId]
  );
  if (!r) return null;
  return {
    id: r.id,
    accountId: r.account_id,
    type: r.type,
    amountPaise: r.amount_paise,
    currency: r.currency,
    merchantName: r.merchant_name || undefined,
    payeeVpa: r.payee_vpa || undefined,
    rawNarration: r.raw_narration || undefined,
    categoryId: r.category_id || undefined,
    envelopeId: r.envelope_id || undefined,
    referenceId: r.reference_id || undefined,
    upiTxnId: r.upi_txn_id || undefined,
    accountLast4: r.account_last4 || undefined,
    balanceAfterPaise: r.balance_after_paise ?? undefined,
    bankName: r.bank_name || undefined,
    channel: r.channel,
    source: r.source,
    confidence: r.confidence ?? undefined,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  };
}

export function updateTransactionEnvelope(
  transactionId: string,
  envelopeId: string,
  categoryId?: string
): void {
  const tx = getTransactionById(transactionId);
  const hadNoEnvelope = !tx?.envelopeId;
  const deductRupees = tx?.amountPaise ? toRupees(tx.amountPaise) : 0;
  const targetCategory = categoryId && categoryId !== 'UNCLASSIFIED' ? categoryId : 'OTHER';

  db.withTransactionSync(() => {
    db.runSync(
      'UPDATE transactions SET envelope_id = ?, category_id = ? WHERE id = ?',
      [envelopeId, targetCategory, transactionId]
    );

    // If an EXPENSE was previously unallocated (no envelope assigned),
    // allocate it by deducting from the envelope (if not 'unallocated') and recording the ledger adjustment
    if (hadNoEnvelope && tx?.type === 'EXPENSE' && deductRupees > 0) {
      if (envelopeId !== 'unallocated') {
        db.runSync(
          'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
          [deductRupees, envelopeId]
        );
      }

      const snap = getBalanceSnapshot();
      if (snap) {
        const newTracked = roundAmount(Math.max(0, snap.amount - deductRupees));
        db.runSync(
          'INSERT INTO balance_snapshots (id, amount, source, createdAt) VALUES (?, ?, ?, ?)',
          [generateId('snap'), newTracked, 'SMS_REPORTED', new Date().toISOString()]
        );
      }

      db.runSync(
        `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId('event'),
          'PAYMENT_SUCCESS',
          deductRupees,
          envelopeId === 'unallocated' ? null : envelopeId,
          null,
          null,
          envelopeId === 'unallocated'
            ? `Review Queue Allocated to Unallocated Cash: ${tx.merchantName || tx.payeeVpa || 'Payment'} (₹${deductRupees})`
            : `Review Queue Allocated: ${tx.merchantName || tx.payeeVpa || 'Payment'} (₹${deductRupees})`,
          new Date().toISOString(),
        ]
      );
    }

    // If an INCOME was previously unallocated (no envelope assigned) and is assigned to a specific bucket:
    if (hadNoEnvelope && tx?.type === 'INCOME' && deductRupees > 0) {
      if (envelopeId !== 'unallocated') {
        db.runSync(
          'UPDATE envelopes SET currentAmount = currentAmount + ? WHERE id = ?',
          [deductRupees, envelopeId]
        );

        db.runSync(
          `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, paymentId, note, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId('event'),
            'ALLOCATION_TRANSFER',
            deductRupees,
            null,
            envelopeId,
            null,
            `Review Queue Allocated Income to ${envelopeId}: ${tx.merchantName || tx.payeeVpa || 'Credit'} (₹${deductRupees})`,
            new Date().toISOString(),
          ]
        );
      }
    }
  });
}

export function getUnclassifiedTransactions(limit: number = 100): Transaction[] {
  const rows = db.getAllSync<any>(
    `SELECT * FROM transactions 
     WHERE envelope_id IS NULL OR category_id = 'UNCLASSIFIED'
     ORDER BY occurred_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    type: r.type,
    amountPaise: r.amount_paise,
    currency: r.currency,
    merchantName: r.merchant_name || undefined,
    payeeVpa: r.payee_vpa || undefined,
    rawNarration: r.raw_narration || undefined,
    categoryId: r.category_id || undefined,
    envelopeId: r.envelope_id || undefined,
    referenceId: r.reference_id || undefined,
    upiTxnId: r.upi_txn_id || undefined,
    accountLast4: r.account_last4 || undefined,
    balanceAfterPaise: r.balance_after_paise ?? undefined,
    bankName: r.bank_name || undefined,
    channel: r.channel,
    source: r.source,
    confidence: r.confidence ?? undefined,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  }));
}

// -------------------------------------------------------------
// Transaction Messages (SMS Ingestion & Deduplication)
// -------------------------------------------------------------

export function insertTransactionMessage(msg: TransactionMessage): TransactionMessage {
  db.runSync(
    `INSERT OR REPLACE INTO transaction_messages (
      id, transaction_id, sender, message_hash, received_at, parser_version
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      msg.id,
      msg.transactionId,
      msg.sender,
      msg.messageHash,
      msg.receivedAt,
      msg.parserVersion,
    ]
  );
  return msg;
}

export function hasTransactionMessageHash(messageHash: string): boolean {
  if (!messageHash || !db) return false;
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transaction_messages WHERE message_hash = ?',
    [messageHash]
  );
  return !!(row && row.count > 0);
}

// -------------------------------------------------------------
// Payment Attempts (3-Signal Google Pay State Machine)
// -------------------------------------------------------------

export function insertPaymentAttempt(attempt: PaymentAttempt): PaymentAttempt {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO payment_attempts (
      id, envelope_id, requested_amount_paise, payee_name,
      payee_vpa, qr_payload, transaction_ref, upi_txn_id,
      approval_ref_no, response_code, returned_amount_paise,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attempt.id,
      attempt.envelopeId,
      attempt.requestedAmountPaise,
      attempt.payeeName || null,
      attempt.payeeVpa,
      attempt.qrPayload || null,
      attempt.transactionRef,
      attempt.upiTxnId || null,
      attempt.approvalRefNo || null,
      attempt.responseCode || null,
      attempt.returnedAmountPaise ?? null,
      attempt.status,
      attempt.createdAt || now,
      now,
    ]
  );
  return attempt;
}

export function updatePaymentAttempt(
  id: string,
  updates: Partial<PaymentAttempt>
): PaymentAttempt | null {
  const current = getPaymentAttemptById(id);
  if (!current) return null;

  const updated: PaymentAttempt = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.runSync(
    `UPDATE payment_attempts SET
      status = ?, upi_txn_id = ?, approval_ref_no = ?,
      response_code = ?, returned_amount_paise = ?, updated_at = ?
    WHERE id = ?`,
    [
      updated.status,
      updated.upiTxnId || null,
      updated.approvalRefNo || null,
      updated.responseCode || null,
      updated.returnedAmountPaise ?? null,
      updated.updatedAt,
      id,
    ]
  );

  return updated;
}

export function getPaymentAttemptById(id: string): PaymentAttempt | null {
  const r = db.getFirstSync<any>('SELECT * FROM payment_attempts WHERE id = ?', [id]);
  if (!r) return null;
  return {
    id: r.id,
    envelopeId: r.envelope_id,
    requestedAmountPaise: r.requested_amount_paise,
    payeeName: r.payee_name || undefined,
    payeeVpa: r.payee_vpa,
    qrPayload: r.qr_payload || undefined,
    transactionRef: r.transaction_ref,
    upiTxnId: r.upi_txn_id || undefined,
    approvalRefNo: r.approval_ref_no || undefined,
    responseCode: r.response_code || undefined,
    returnedAmountPaise: r.returned_amount_paise ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getPendingPaymentAttempts(): PaymentAttempt[] {
  const rows = db.getAllSync<any>(
    "SELECT * FROM payment_attempts WHERE status IN ('INITIATED', 'SUBMITTED') ORDER BY created_at DESC"
  );
  return rows.map((r) => ({
    id: r.id,
    envelopeId: r.envelope_id,
    requestedAmountPaise: r.requested_amount_paise,
    payeeName: r.payee_name || undefined,
    payeeVpa: r.payee_vpa,
    qrPayload: r.qr_payload || undefined,
    transactionRef: r.transaction_ref,
    upiTxnId: r.upi_txn_id || undefined,
    approvalRefNo: r.approval_ref_no || undefined,
    responseCode: r.response_code || undefined,
    returnedAmountPaise: r.returned_amount_paise ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

// -------------------------------------------------------------
// Merchant & Category Rules (User Corrections & Engine)
// -------------------------------------------------------------

export function getMerchantRules(): MerchantRule[] {
  const rows = db.getAllSync<any>(
    'SELECT * FROM merchant_rules ORDER BY priority DESC, created_at DESC'
  );
  return rows.map((r) => ({
    id: r.id,
    normalizedMerchant: r.normalized_merchant || undefined,
    normalizedVpa: r.normalized_vpa || undefined,
    categoryId: r.category_id,
    envelopeId: r.envelope_id || undefined,
    source: r.source,
    priority: r.priority,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function saveMerchantRule(
  rule: Omit<MerchantRule, 'id' | 'createdAt' | 'updatedAt'>
): MerchantRule {
  const now = new Date().toISOString();
  const id = generateId('rule_merch');
  const fullRule: MerchantRule = {
    ...rule,
    id,
    createdAt: now,
    updatedAt: now,
  };

  db.runSync(
    `INSERT INTO merchant_rules (
      id, normalized_merchant, normalized_vpa, category_id,
      envelope_id, source, priority, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fullRule.id,
      fullRule.normalizedMerchant || null,
      fullRule.normalizedVpa || null,
      fullRule.categoryId,
      fullRule.envelopeId || null,
      fullRule.source,
      fullRule.priority,
      fullRule.createdAt,
      fullRule.updatedAt,
    ]
  );
  return fullRule;
}

export function findMerchantRule(
  normalizedVpa?: string,
  normalizedMerchant?: string
): MerchantRule | null {
  if (!db) return null;

  if (normalizedVpa) {
    const vpaRule = db.getFirstSync<any>(
      'SELECT * FROM merchant_rules WHERE normalized_vpa = ? ORDER BY priority DESC, created_at DESC LIMIT 1',
      [normalizedVpa]
    );
    if (vpaRule) {
      return {
        id: vpaRule.id,
        normalizedMerchant: vpaRule.normalized_merchant || undefined,
        normalizedVpa: vpaRule.normalized_vpa || undefined,
        categoryId: vpaRule.category_id,
        envelopeId: vpaRule.envelope_id || undefined,
        source: vpaRule.source,
        priority: vpaRule.priority,
        createdAt: vpaRule.created_at,
        updatedAt: vpaRule.updated_at,
      };
    }
  }

  if (normalizedMerchant) {
    const merchantRule = db.getFirstSync<any>(
      'SELECT * FROM merchant_rules WHERE normalized_merchant = ? ORDER BY priority DESC, created_at DESC LIMIT 1',
      [normalizedMerchant]
    );
    if (merchantRule) {
      return {
        id: merchantRule.id,
        normalizedMerchant: merchantRule.normalized_merchant || undefined,
        normalizedVpa: merchantRule.normalized_vpa || undefined,
        categoryId: merchantRule.category_id,
        envelopeId: merchantRule.envelope_id || undefined,
        source: merchantRule.source,
        priority: merchantRule.priority,
        createdAt: merchantRule.created_at,
        updatedAt: merchantRule.updated_at,
      };
    }
  }

  return null;
}

export function getCategoryRules(): CategoryRule[] {
  const rows = db.getAllSync<any>(
    'SELECT * FROM category_rules WHERE enabled = 1 ORDER BY priority DESC'
  );
  return rows.map((r) => ({
    id: r.id,
    pattern: r.pattern,
    matchType: r.match_type,
    categoryId: r.category_id,
    priority: r.priority,
    enabled: !!r.enabled,
  }));
}

export function saveCategoryRule(
  rule: Omit<CategoryRule, 'id'>
): CategoryRule {
  const id = generateId('rule_cat');
  const fullRule: CategoryRule = {
    ...rule,
    id,
  };

  db.runSync(
    `INSERT INTO category_rules (id, pattern, match_type, category_id, priority, enabled)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      fullRule.id,
      fullRule.pattern,
      fullRule.matchType,
      fullRule.categoryId,
      fullRule.priority,
      fullRule.enabled ? 1 : 0,
    ]
  );
  return fullRule;
}

// --------------------------------------------------------------------------
// GOALS & SCHEDULED ALLOCATION PERSISTENCE
// --------------------------------------------------------------------------

export function getGoals(): Goal[] {
  const rows = db.getAllSync<any>(`
    SELECT id, name, target_amount_paise, current_balance_paise, cadence,
           installment_amount_paise, deadline, next_contribution_date,
           status, envelope_id, created_at, updated_at
    FROM goals
    ORDER BY created_at DESC
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    targetAmountPaise: r.target_amount_paise,
    currentBalancePaise: r.current_balance_paise,
    cadence: r.cadence as GoalCadence,
    installmentAmountPaise: r.installment_amount_paise,
    deadline: r.deadline,
    nextContributionDate: r.next_contribution_date,
    status: r.status as GoalStatus,
    envelopeId: r.envelope_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getGoalById(id: string): Goal | null {
  const r = db.getFirstSync<any>(`
    SELECT id, name, target_amount_paise, current_balance_paise, cadence,
           installment_amount_paise, deadline, next_contribution_date,
           status, envelope_id, created_at, updated_at
    FROM goals
    WHERE id = ?
  `, [id]);

  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    targetAmountPaise: r.target_amount_paise,
    currentBalancePaise: r.current_balance_paise,
    cadence: r.cadence as GoalCadence,
    installmentAmountPaise: r.installment_amount_paise,
    deadline: r.deadline,
    nextContributionDate: r.next_contribution_date,
    status: r.status as GoalStatus,
    envelopeId: r.envelope_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function insertGoal(goal: Goal): void {
  db.runSync(
    `INSERT INTO goals (
      id, name, target_amount_paise, current_balance_paise, cadence,
      installment_amount_paise, deadline, next_contribution_date,
      status, envelope_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.name,
      goal.targetAmountPaise,
      goal.currentBalancePaise,
      goal.cadence,
      goal.installmentAmountPaise,
      goal.deadline,
      goal.nextContributionDate,
      goal.status,
      goal.envelopeId,
      goal.createdAt,
      goal.updatedAt,
    ]
  );
}

export function updateGoal(id: string, updates: Partial<Goal>): void {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.targetAmountPaise !== undefined) {
    fields.push('target_amount_paise = ?');
    values.push(updates.targetAmountPaise);
  }
  if (updates.currentBalancePaise !== undefined) {
    fields.push('current_balance_paise = ?');
    values.push(updates.currentBalancePaise);
  }
  if (updates.cadence !== undefined) {
    fields.push('cadence = ?');
    values.push(updates.cadence);
  }
  if (updates.installmentAmountPaise !== undefined) {
    fields.push('installment_amount_paise = ?');
    values.push(updates.installmentAmountPaise);
  }
  if (updates.deadline !== undefined) {
    fields.push('deadline = ?');
    values.push(updates.deadline);
  }
  if (updates.nextContributionDate !== undefined) {
    fields.push('next_contribution_date = ?');
    values.push(updates.nextContributionDate);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  db.runSync(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteGoal(id: string): void {
  db.withTransactionSync(() => {
    const goal = getGoalById(id);
    if (goal) {
      db.runSync('DELETE FROM goal_shortfalls WHERE goal_id = ?', [id]);
      db.runSync('DELETE FROM goals WHERE id = ?', [id]);
      // Deactivate linked Goal Bucket envelope
      db.runSync('UPDATE envelopes SET isActive = 0 WHERE id = ?', [goal.envelopeId]);
    }
  });
}

export function getGoalShortfalls(onlyUnresolved = true): GoalShortfall[] {
  const query = onlyUnresolved
    ? 'SELECT * FROM goal_shortfalls WHERE resolved = 0 ORDER BY created_at DESC'
    : 'SELECT * FROM goal_shortfalls ORDER BY created_at DESC';

  const rows = db.getAllSync<any>(query);
  return rows.map((r) => ({
    id: r.id,
    goalId: r.goal_id,
    dueDate: r.due_date,
    plannedAmountPaise: r.planned_amount_paise,
    allocatedAmountPaise: r.allocated_amount_paise,
    shortfallAmountPaise: r.shortfall_amount_paise,
    unallocatedAvailablePaise: r.unallocated_available_paise,
    resolved: !!r.resolved,
    createdAt: r.created_at,
  }));
}

export function insertGoalShortfall(shortfall: GoalShortfall): void {
  db.runSync(
    `INSERT INTO goal_shortfalls (
      id, goal_id, due_date, planned_amount_paise, allocated_amount_paise,
      shortfall_amount_paise, unallocated_available_paise, resolved, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shortfall.id,
      shortfall.goalId,
      shortfall.dueDate,
      shortfall.plannedAmountPaise,
      shortfall.allocatedAmountPaise,
      shortfall.shortfallAmountPaise,
      shortfall.unallocatedAvailablePaise,
      shortfall.resolved ? 1 : 0,
      shortfall.createdAt,
    ]
  );
}

export function resolveGoalShortfall(id: string): void {
  db.runSync('UPDATE goal_shortfalls SET resolved = 1 WHERE id = ?', [id]);
}


