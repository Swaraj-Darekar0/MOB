import { SystemCategory } from '../../../types';

export interface CategoryMetadata {
  id: SystemCategory;
  displayName: string;
  icon: string;
  color: string;
  description: string;
}

export const SYSTEM_CATEGORIES: Record<SystemCategory, CategoryMetadata> = {
  FOOD_DINING: {
    id: 'FOOD_DINING',
    displayName: 'Food & Dining',
    icon: 'Utensils',
    color: '#FF6B6B',
    description: 'Restaurants, cafes, food delivery, bakeries, fast food',
  },
  GROCERIES: {
    id: 'GROCERIES',
    displayName: 'Groceries',
    icon: 'ShoppingCart',
    color: '#51CF66',
    description: 'Quick commerce, supermarkets, daily essentials',
  },
  TRANSPORT: {
    id: 'TRANSPORT',
    displayName: 'Transport & Commute',
    icon: 'Car',
    color: '#339AF0',
    description: 'Cabs, autos, ride shares, metro, bus, trains',
  },
  FUEL: {
    id: 'FUEL',
    displayName: 'Fuel',
    icon: 'Fuel',
    color: '#FA5252',
    description: 'Petrol, diesel, CNG, EV charging',
  },
  SHOPPING: {
    id: 'SHOPPING',
    displayName: 'Shopping',
    icon: 'ShoppingBag',
    color: '#845EF7',
    description: 'E-commerce, clothing, electronics, retail',
  },
  BILLS_UTILITIES: {
    id: 'BILLS_UTILITIES',
    displayName: 'Bills & Utilities',
    icon: 'Zap',
    color: '#FCC419',
    description: 'Electricity, water, gas, mobile, broadband, DTH',
  },
  RENT_HOUSING: {
    id: 'RENT_HOUSING',
    displayName: 'Rent & Housing',
    icon: 'Home',
    color: '#20C997',
    description: 'House rent, society maintenance, home repairs',
  },
  ENTERTAINMENT_SUBSCRIPTIONS: {
    id: 'ENTERTAINMENT_SUBSCRIPTIONS',
    displayName: 'Entertainment & OTT',
    icon: 'Film',
    color: '#E64980',
    description: 'OTT streaming, movies, gaming, events',
  },
  TRAVEL: {
    id: 'TRAVEL',
    displayName: 'Travel & Holidays',
    icon: 'Plane',
    color: '#4DABF7',
    description: 'Flights, hotels, vacations, booking portals',
  },
  HEALTHCARE: {
    id: 'HEALTHCARE',
    displayName: 'Healthcare & Medical',
    icon: 'HeartPulse',
    color: '#FF8787',
    description: 'Pharmacies, doctors, clinics, diagnostics, hospitals',
  },
  EDUCATION: {
    id: 'EDUCATION',
    displayName: 'Education',
    icon: 'GraduationCap',
    color: '#40C057',
    description: 'Tuition, school/college fees, online courses, books',
  },
  EMI_DEBT: {
    id: 'EMI_DEBT',
    displayName: 'EMI & Loans',
    icon: 'CreditCard',
    color: '#F76707',
    description: 'Home/auto/personal loan EMIs, credit card bills',
  },
  INSURANCE: {
    id: 'INSURANCE',
    displayName: 'Insurance',
    icon: 'Shield',
    color: '#15AABF',
    description: 'Life, health, vehicle, and property insurance',
  },
  PERSONAL_CARE: {
    id: 'PERSONAL_CARE',
    displayName: 'Personal Care & Grooming',
    icon: 'Sparkles',
    color: '#BE4BDB',
    description: 'Salons, spas, beauty, haircuts, personal hygiene',
  },
  FAMILY_GIFTS: {
    id: 'FAMILY_GIFTS',
    displayName: 'Family & Gifts',
    icon: 'Gift',
    color: '#F06595',
    description: 'Presents, donations, family allowances',
  },
  INVESTMENT_SAVINGS: {
    id: 'INVESTMENT_SAVINGS',
    displayName: 'Investments & Savings',
    icon: 'TrendingUp',
    color: '#12B886',
    description: 'Mutual funds, SIPs, stocks, fixed deposits, gold',
  },
  CASH_ATM: {
    id: 'CASH_ATM',
    displayName: 'Cash & ATM',
    icon: 'Banknote',
    color: '#868E96',
    description: 'ATM withdrawals, self cash debits',
  },
  BANK_FEES: {
    id: 'BANK_FEES',
    displayName: 'Bank Charges & Fees',
    icon: 'Receipt',
    color: '#CED4DA',
    description: 'Annual card fees, minimum balance charges, SMS charges',
  },
  TRANSFER: {
    id: 'TRANSFER',
    displayName: 'Transfer / Peer-to-Peer',
    icon: 'ArrowRightLeft',
    color: '#495057',
    description: 'P2P transfers, friends & family transfers',
  },
  INCOME: {
    id: 'INCOME',
    displayName: 'Income & Salary',
    icon: 'ArrowDownLeft',
    color: '#2B8A3E',
    description: 'Salary, interest, dividends, incoming payments',
  },
  REFUND: {
    id: 'REFUND',
    displayName: 'Refunds & Reversals',
    icon: 'RotateCcw',
    color: '#22B8CF',
    description: 'Returned funds, reversal of failed transactions',
  },
  OTHER: {
    id: 'OTHER',
    displayName: 'Other',
    icon: 'MoreHorizontal',
    color: '#ADB5BD',
    description: 'Miscellaneous expenses',
  },
  UNCLASSIFIED: {
    id: 'UNCLASSIFIED',
    displayName: 'Unclassified',
    icon: 'HelpCircle',
    color: '#6C757D',
    description: 'Transactions requiring user confirmation',
  },
};
