import React from 'react';
import {
  Trophy,
  Moon,
  Wind,
  HeartHandshake,
  Laptop,
  Plane,
  Car,
  Home,
  Gift,
  GraduationCap,
  Gamepad2,
  TrendingUp,
  Rocket,
  Compass,
  Flame,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';
import { Goal } from '../types';

export interface GoalVisuals {
  IconComponent: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string;
  bgColor: string;
  emotionalTag?: string;
  emotionalTagColor?: string;
}

/**
 * Resolves deterministic icons, theme colors, and emotional companion tags for a goal.
 */
export function getGoalVisuals(goal: Goal, hasShortfall: boolean): GoalVisuals {
  // 1. If completed
  if (goal.status === 'COMPLETED' || goal.currentBalancePaise >= goal.targetAmountPaise) {
    return {
      IconComponent: Trophy,
      color: '#EAB308',
      bgColor: 'rgba(234, 179, 8, 0.16)',
      emotionalTag: '🎉 Target Reached',
      emotionalTagColor: '#EAB308',
    };
  }

  // 2. If shortfall: empathetic emotional tag
  if (hasShortfall) {
    return {
      IconComponent: Wind,
      color: '#FB7185',
      bgColor: 'rgba(251, 113, 133, 0.18)',
      emotionalTag: '💨 sigh · shortfall strain',
      emotionalTagColor: '#FB7185',
    };
  }

  // 3. If paused
  if (goal.status === 'PAUSED') {
    return {
      IconComponent: Moon,
      color: '#94A3B8',
      bgColor: 'rgba(148, 163, 184, 0.15)',
      emotionalTag: '⏸ On Hold',
      emotionalTagColor: '#94A3B8',
    };
  }

  // Pacing tight check: <= 14 days left and < 45% progress
  const now = new Date().getTime();
  const deadlineTime = new Date(goal.deadline).getTime();
  const daysLeft = Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24));
  const progressRatio = goal.targetAmountPaise > 0 ? goal.currentBalancePaise / goal.targetAmountPaise : 0;

  if (daysLeft > 0 && daysLeft <= 14 && progressRatio < 0.45) {
    return {
      IconComponent: Wind,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.18)',
      emotionalTag: '💨 sigh · clock ticking',
      emotionalTagColor: '#F59E0B',
    };
  }

  // 4. Content / name keyword matching
  const name = goal.name.toLowerCase();

  if (
    name.includes('laptop') ||
    name.includes('macbook') ||
    name.includes('tech') ||
    name.includes('phone') ||
    name.includes('iphone') ||
    name.includes('gadget') ||
    name.includes('pc') ||
    name.includes('camera')
  ) {
    return {
      IconComponent: Laptop,
      color: '#6366F1',
      bgColor: 'rgba(99, 102, 241, 0.16)',
    };
  }

  if (
    name.includes('trip') ||
    name.includes('travel') ||
    name.includes('vacation') ||
    name.includes('bali') ||
    name.includes('flight') ||
    name.includes('tour') ||
    name.includes('holiday') ||
    name.includes('japan')
  ) {
    return {
      IconComponent: Plane,
      color: '#06B6D4',
      bgColor: 'rgba(6, 182, 212, 0.16)',
    };
  }

  if (
    name.includes('car') ||
    name.includes('bike') ||
    name.includes('vehicle') ||
    name.includes('commute') ||
    name.includes('scooter') ||
    name.includes('ev') ||
    name.includes('auto')
  ) {
    return {
      IconComponent: Car,
      color: '#F97316',
      bgColor: 'rgba(249, 115, 22, 0.16)',
    };
  }

  if (
    name.includes('home') ||
    name.includes('rent') ||
    name.includes('flat') ||
    name.includes('house') ||
    name.includes('interior') ||
    name.includes('furniture')
  ) {
    return {
      IconComponent: Home,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.16)',
    };
  }

  if (
    name.includes('emergency') ||
    name.includes('health') ||
    name.includes('medical') ||
    name.includes('rainy') ||
    name.includes('safety') ||
    name.includes('hospital')
  ) {
    return {
      IconComponent: HeartHandshake,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.16)',
      emotionalTag: '🛡 Safety Net',
      emotionalTagColor: '#10B981',
    };
  }

  if (
    name.includes('gift') ||
    name.includes('wedding') ||
    name.includes('anniversary') ||
    name.includes('ring') ||
    name.includes('birthday') ||
    name.includes('partner')
  ) {
    return {
      IconComponent: Gift,
      color: '#EC4899',
      bgColor: 'rgba(236, 72, 153, 0.16)',
    };
  }

  if (
    name.includes('course') ||
    name.includes('book') ||
    name.includes('study') ||
    name.includes('exam') ||
    name.includes('school') ||
    name.includes('college') ||
    name.includes('learn')
  ) {
    return {
      IconComponent: GraduationCap,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.16)',
    };
  }

  if (
    name.includes('game') ||
    name.includes('ps5') ||
    name.includes('playstation') ||
    name.includes('xbox') ||
    name.includes('concert') ||
    name.includes('music') ||
    name.includes('fun')
  ) {
    return {
      IconComponent: Gamepad2,
      color: '#A855F7',
      bgColor: 'rgba(168, 85, 247, 0.16)',
    };
  }

  if (
    name.includes('invest') ||
    name.includes('stock') ||
    name.includes('crypto') ||
    name.includes('wealth') ||
    name.includes('growth') ||
    name.includes('fund')
  ) {
    return {
      IconComponent: TrendingUp,
      color: '#22C55E',
      bgColor: 'rgba(34, 197, 94, 0.16)',
    };
  }

  // 5. Deterministic rotation based on goal ID/name hash
  const PALETTE = [
    { icon: Rocket, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.16)' },
    { icon: Compass, color: '#F472B6', bg: 'rgba(244, 114, 182, 0.16)' },
    { icon: Flame, color: '#FB923C', bg: 'rgba(251, 146, 60, 0.16)' },
    { icon: Sparkles, color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.16)' },
    { icon: ShieldCheck, color: '#34D399', bg: 'rgba(52, 211, 153, 0.16)' },
  ];

  let hash = 0;
  const seed = goal.id || goal.name;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const chosen = PALETTE[Math.abs(hash) % PALETTE.length];

  return {
    IconComponent: chosen.icon,
    color: chosen.color,
    bgColor: chosen.bg,
  };
}
