import {
  Goal,
  GoalCadence,
  GoalShortfall,
  GoalAllocationResult,
  MoneyPaise,
  Envelope,
} from '../../types';
import {
  db,
  generateId,
  getGoals,
  getGoalById,
  updateGoal,
  insertGoal,
  insertGoalShortfall,
  resolveGoalShortfall,
  getEnvelopes,
  createEnvelope,
  allocateMoney,
} from '../db/database';
import { toRupees, toPaise, subPaise, addPaise } from '../../utils/money';
import {
  calculateInstallmentAmount,
  advanceNextDueDate,
  analyzeCashFlowHabits,
  CashFlowHabitAnalysis,
  CadenceInsight,
} from './goalCalculations';

export {
  calculateInstallmentAmount,
  advanceNextDueDate,
  analyzeCashFlowHabits,
  CashFlowHabitAnalysis,
  CadenceInsight,
};

/**
 * Creates a Goal along with its dedicated Goal Bucket envelope.
 * Invariant: Every goal has exactly one dedicated virtual envelope (archetype = 'GOAL').
 */
export function createGoalWithDedicatedBucket(params: {
  name: string;
  targetAmountPaise: MoneyPaise;
  deadline: string; // YYYY-MM-DD
  cadence: GoalCadence;
  initialDepositPaise?: MoneyPaise;
}): Goal {
  const goalId = generateId('goal');
  const todayIso = new Date().toISOString().split('T')[0];

  const installmentPaise = calculateInstallmentAmount(
    params.targetAmountPaise,
    params.initialDepositPaise || 0,
    params.deadline,
    params.cadence,
    todayIso
  );

  let initialBalancePaise = 0;
  let envelopeId = '';

  db.withTransactionSync(() => {
    // 1. Create dedicated virtual Goal Bucket envelope
    const createdEnv = createEnvelope({
      name: `Goal: ${params.name}`,
      archetype: 'GOAL',
      currentAmount: toRupees(params.initialDepositPaise || 0),
      targetAmount: toRupees(params.targetAmountPaise),
      color: '#38BDF8',
      icon: 'Target',
      sortOrder: 100,
      isActive: true,
    });
    envelopeId = createdEnv.id;

    // 2. If initial deposit requested, transfer from Unallocated
    if (params.initialDepositPaise && params.initialDepositPaise > 0) {
      const unallocated = getEnvelopes().find((e) => e.isUnallocated || e.name.toLowerCase() === 'unallocated');
      if (unallocated) {
        const depositRupees = toRupees(params.initialDepositPaise);
        db.runSync(
          'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
          [depositRupees, unallocated.id]
        );
        db.runSync(
          'UPDATE envelopes SET currentAmount = currentAmount + ? WHERE id = ?',
          [depositRupees, envelopeId]
        );
        initialBalancePaise = params.initialDepositPaise;

        db.runSync(
          `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, note, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId('event'),
            'ALLOCATE_TO_ENVELOPE',
            depositRupees,
            unallocated.id,
            envelopeId,
            `Initial funding for goal: ${params.name}`,
            new Date().toISOString(),
          ]
        );
      }
    }

    // 3. Create Goal Record
    const goal: Goal = {
      id: goalId,
      name: params.name,
      targetAmountPaise: params.targetAmountPaise,
      currentBalancePaise: initialBalancePaise,
      cadence: params.cadence,
      installmentAmountPaise: installmentPaise,
      deadline: params.deadline,
      nextContributionDate: todayIso,
      status: 'ACTIVE',
      envelopeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    insertGoal(goal);
  });

  return getGoalById(goalId)!;
}

/**
 * Deterministic schedule engine: executes due goal contributions from Unallocated.
 * Invariants:
 * - Partial allocation is the default when Unallocated funds are insufficient.
 * - Does not silently take money from other envelopes.
 * - Total bank balance never changes (pure virtual allocation).
 */
export function processScheduledGoalAllocations(
  todayStr: string = new Date().toISOString().split('T')[0]
): {
  allocations: GoalAllocationResult[];
  shortfalls: GoalShortfall[];
} {
  const activeGoals = getGoals().filter(
    (g) => g.status === 'ACTIVE' && g.nextContributionDate <= todayStr
  );

  const allocations: GoalAllocationResult[] = [];
  const shortfalls: GoalShortfall[] = [];

  if (activeGoals.length === 0) {
    return { allocations, shortfalls };
  }

  db.withTransactionSync(() => {
    const envelopes = getEnvelopes();
    const unallocatedEnv = envelopes.find(
      (e) => e.isUnallocated || e.name.toLowerCase() === 'unallocated'
    );

    let availableUnallocatedPaise = unallocatedEnv
      ? toPaise(Math.max(0, unallocatedEnv.currentAmount))
      : 0;

    for (const goal of activeGoals) {
      const plannedPaise = goal.installmentAmountPaise;
      const allocatedPaise = Math.min(plannedPaise, availableUnallocatedPaise);
      const shortfallPaise = subPaise(plannedPaise, allocatedPaise);
      const isPartial = shortfallPaise > 0;

      // 1. Transfer allocated amount from Unallocated to Goal Bucket
      if (allocatedPaise > 0 && unallocatedEnv) {
        const allocatedRupees = toRupees(allocatedPaise);
        db.runSync(
          'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
          [allocatedRupees, unallocatedEnv.id]
        );
        db.runSync(
          'UPDATE envelopes SET currentAmount = currentAmount + ? WHERE id = ?',
          [allocatedRupees, goal.envelopeId]
        );

        availableUnallocatedPaise = subPaise(availableUnallocatedPaise, allocatedPaise);

        db.runSync(
          `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, note, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId('event'),
            'ALLOCATE_TO_ENVELOPE',
            allocatedRupees,
            unallocatedEnv.id,
            goal.envelopeId,
            `Scheduled allocation: ${goal.name} (Plan: ₹${(plannedPaise / 100).toFixed(2)})`,
            new Date().toISOString(),
          ]
        );
      }

      // 2. Update Goal balance and advance next contribution date
      const newBalancePaise = addPaise(goal.currentBalancePaise, allocatedPaise);
      const isCompleted = newBalancePaise >= goal.targetAmountPaise;
      const nextDate = advanceNextDueDate(goal.nextContributionDate, goal.cadence);

      updateGoal(goal.id, {
        currentBalancePaise: newBalancePaise,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        nextContributionDate: nextDate,
      });

      // 3. Record Shortfall if partial or zero allocation occurred
      if (shortfallPaise > 0) {
        const shortfall: GoalShortfall = {
          id: generateId('shortfall'),
          goalId: goal.id,
          dueDate: goal.nextContributionDate,
          plannedAmountPaise: plannedPaise,
          allocatedAmountPaise: allocatedPaise,
          shortfallAmountPaise: shortfallPaise,
          unallocatedAvailablePaise: availableUnallocatedPaise,
          resolved: false,
          createdAt: new Date().toISOString(),
        };
        insertGoalShortfall(shortfall);
        shortfalls.push(shortfall);
      }

      allocations.push({
        goalId: goal.id,
        goalName: goal.name,
        plannedPaise,
        allocatedPaise,
        shortfallPaise,
        isPartial,
        newNextDueDate: nextDate,
      });
    }
  });

  return { allocations, shortfalls };
}

/**
 * User-Confirmed Shortfall Recovery / Bucket-to-Goal Transfer.
 * Moves money from an existing bucket (regular or another Goal Bucket) into the destination goal.
 * Invariants:
 * - Atomic virtual transfer; bank balance unchanged.
 * - Recalculates remaining installment schedules for both destination goal AND source goal (if applicable).
 * - Resolves active shortfalls for destination goal.
 */
export function moveMoneyToGoal(
  sourceEnvelopeId: string,
  destinationGoalId: string,
  amountPaise: MoneyPaise
): void {
  if (amountPaise <= 0) return;

  const destGoal = getGoalById(destinationGoalId);
  if (!destGoal) throw new Error(`Destination goal ${destinationGoalId} not found`);

  const amountRupees = toRupees(amountPaise);
  const isFromUnallocated = sourceEnvelopeId === 'unallocated';

  const envelopes = getEnvelopes();
  const sourceEnv = !isFromUnallocated ? envelopes.find((e) => e.id === sourceEnvelopeId) : null;
  if (!isFromUnallocated && !sourceEnv) throw new Error(`Source envelope ${sourceEnvelopeId} not found`);

  const sourceName = isFromUnallocated ? 'Unallocated Cash' : sourceEnv?.name || 'Bucket';

  db.withTransactionSync(() => {
    // 1. Transfer funds
    if (isFromUnallocated) {
      allocateMoney(null, destGoal.envelopeId, amountRupees);
    } else {
      db.runSync(
        'UPDATE envelopes SET currentAmount = currentAmount - ? WHERE id = ?',
        [amountRupees, sourceEnvelopeId]
      );
      db.runSync(
        'UPDATE envelopes SET currentAmount = currentAmount + ? WHERE id = ?',
        [amountRupees, destGoal.envelopeId]
      );
    }

    // 2. Update Destination Goal Balance
    const newDestBalance = addPaise(destGoal.currentBalancePaise, amountPaise);
    const isCompleted = newDestBalance >= destGoal.targetAmountPaise;

    // Recalculate destination goal installment
    const todayIso = new Date().toISOString().split('T')[0];
    const newDestInstallment = calculateInstallmentAmount(
      destGoal.targetAmountPaise,
      newDestBalance,
      destGoal.deadline,
      destGoal.cadence,
      todayIso
    );

    updateGoal(destGoal.id, {
      currentBalancePaise: newDestBalance,
      installmentAmountPaise: newDestInstallment,
      status: isCompleted ? 'COMPLETED' : destGoal.status,
    });

    // 3. If source envelope belongs to another Goal, update that goal as well
    if (!isFromUnallocated) {
      const allGoals = getGoals();
      const sourceGoal = allGoals.find((g) => g.envelopeId === sourceEnvelopeId);
      if (sourceGoal) {
        const newSourceBalance = Math.max(0, subPaise(sourceGoal.currentBalancePaise, amountPaise));
        const newSourceInstallment = calculateInstallmentAmount(
          sourceGoal.targetAmountPaise,
          newSourceBalance,
          sourceGoal.deadline,
          sourceGoal.cadence,
          todayIso
        );

        updateGoal(sourceGoal.id, {
          currentBalancePaise: newSourceBalance,
          installmentAmountPaise: newSourceInstallment,
        });
      }
    }

    // 4. Resolve pending shortfalls for destination goal
    db.runSync(
      'UPDATE goal_shortfalls SET resolved = 1 WHERE goal_id = ? AND resolved = 0',
      [destinationGoalId]
    );

    // 5. Audit Ledger Event
    if (!isFromUnallocated) {
      db.runSync(
        `INSERT INTO ledger_events (id, type, amount, sourceEnvelopeId, destinationEnvelopeId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId('event'),
          'MOVE_BETWEEN_ENVELOPES',
          amountRupees,
          sourceEnvelopeId,
          destGoal.envelopeId,
          `Transferred to goal: ${destGoal.name} (Source: ${sourceName})`,
          new Date().toISOString(),
        ]
      );
    }
  });
}
