import { SystemCategory } from '../../../types';

export interface KnownMerchant {
  canonicalName: string;
  category: SystemCategory;
  aliases: string[];
  vpaHandles?: string[];
  keywords?: string[];
}

export const KNOWN_MERCHANTS: KnownMerchant[] = [
  // 1. Food & Dining
  {
    canonicalName: 'Swiggy',
    category: 'FOOD_DINING',
    aliases: ['swiggy', 'swiggy delivery', 'bundl technologies'],
    vpaHandles: ['swiggy@icici', 'swiggy@axis', 'swiggy@hdfcbank'],
    keywords: ['swiggy'],
  },
  {
    canonicalName: 'Zomato',
    category: 'FOOD_DINING',
    aliases: ['zomato', 'zomato limited', 'zomato media'],
    vpaHandles: ['zomato@icici', 'zomato@hdfcbank'],
    keywords: ['zomato'],
  },
  {
    canonicalName: "Domino's Pizza",
    category: 'FOOD_DINING',
    aliases: ['dominos', 'domino pizza', 'jubilant foodworks'],
    keywords: ['dominos'],
  },
  {
    canonicalName: "McDonald's",
    category: 'FOOD_DINING',
    aliases: ['mcdonalds', 'mcdonald', 'hardcastle restaurants'],
    keywords: ['mcdonalds'],
  },
  {
    canonicalName: 'KFC',
    category: 'FOOD_DINING',
    aliases: ['kfc', 'yum brands', 'devyani international', 'sapphire foods'],
    keywords: ['kfc'],
  },
  {
    canonicalName: 'Burger King',
    category: 'FOOD_DINING',
    aliases: ['burger king', 'restaurant brands asia'],
    keywords: ['burger king'],
  },
  {
    canonicalName: 'Subway',
    category: 'FOOD_DINING',
    aliases: ['subway'],
    keywords: ['subway'],
  },
  {
    canonicalName: 'Pizza Hut',
    category: 'FOOD_DINING',
    aliases: ['pizza hut'],
    keywords: ['pizza hut'],
  },
  {
    canonicalName: 'Starbucks',
    category: 'FOOD_DINING',
    aliases: ['starbucks', 'tata starbucks'],
    keywords: ['starbucks'],
  },
  {
    canonicalName: 'Cafe / Dining Generic',
    category: 'FOOD_DINING',
    aliases: ['restaurant', 'cafe', 'bakery', 'kitchen', 'bistro', 'dhaba', 'canteen'],
    keywords: ['restaurant', 'cafe', 'bakery', 'kitchen', 'bistro', 'dhaba'],
  },

  // 2. Groceries
  {
    canonicalName: 'Blinkit',
    category: 'GROCERIES',
    aliases: ['blinkit', 'grofers', 'blink commerce'],
    keywords: ['blinkit'],
  },
  {
    canonicalName: 'Zepto',
    category: 'GROCERIES',
    aliases: ['zepto', 'kiranakart'],
    keywords: ['zepto'],
  },
  {
    canonicalName: 'Instamart',
    category: 'GROCERIES',
    aliases: ['instamart', 'swiggy instamart'],
    keywords: ['instamart'],
  },
  {
    canonicalName: 'BigBasket',
    category: 'GROCERIES',
    aliases: ['bigbasket', 'supermarket grocery supplies', 'bb daily', 'bb instant'],
    keywords: ['bigbasket'],
  },
  {
    canonicalName: 'DMart',
    category: 'GROCERIES',
    aliases: ['dmart', 'avenue supermarts', 'dmart ready'],
    keywords: ['dmart'],
  },
  {
    canonicalName: 'Reliance Smart',
    category: 'GROCERIES',
    aliases: ['reliance smart', 'reliance fresh', 'smart bazaar', 'jiomart'],
    keywords: ['reliance smart', 'jiomart'],
  },
  {
    canonicalName: 'Grocery Generic',
    category: 'GROCERIES',
    aliases: ['grocery', 'supermarket', 'provision store', 'hypermarket', 'kirana'],
    keywords: ['grocery', 'supermarket', 'kirana'],
  },

  // 3. Transport
  {
    canonicalName: 'Uber',
    category: 'TRANSPORT',
    aliases: ['uber', 'uber india'],
    keywords: ['uber'],
  },
  {
    canonicalName: 'Ola Cabs',
    category: 'TRANSPORT',
    aliases: ['ola', 'ani technologies', 'ola cabs', 'ola money'],
    keywords: ['ola'],
  },
  {
    canonicalName: 'Rapido',
    category: 'TRANSPORT',
    aliases: ['rapido', 'roppen transportation'],
    keywords: ['rapido'],
  },
  {
    canonicalName: 'RedBus',
    category: 'TRANSPORT',
    aliases: ['redbus', 'ibibo redbus'],
    keywords: ['redbus'],
  },
  {
    canonicalName: 'Public Transit / Metro',
    category: 'TRANSPORT',
    aliases: ['metro', 'dmrc', 'bmrc', 'mmrcl', 'chalo', 'transit', 'bus', 'auto', 'cab', 'taxi'],
    keywords: ['metro', 'chalo', 'bus ticket', 'taxi', 'auto'],
  },

  // 4. Fuel
  {
    canonicalName: 'HPCL Fuel',
    category: 'FUEL',
    aliases: ['hpcl', 'hindustan petroleum', 'hp retail', 'hp auto'],
    keywords: ['hpcl', 'hindustan petroleum'],
  },
  {
    canonicalName: 'BPCL Fuel',
    category: 'FUEL',
    aliases: ['bpcl', 'bharat petroleum'],
    keywords: ['bpcl', 'bharat petroleum'],
  },
  {
    canonicalName: 'IOCL Fuel',
    category: 'FUEL',
    aliases: ['iocl', 'indian oil', 'indianoil'],
    keywords: ['iocl', 'indianoil', 'indian oil'],
  },
  {
    canonicalName: 'Shell Fuel',
    category: 'FUEL',
    aliases: ['shell', 'shell india'],
    keywords: ['shell fuel', 'shell petrol'],
  },
  {
    canonicalName: 'Fuel Generic',
    category: 'FUEL',
    aliases: ['petrol', 'diesel', 'fuel', 'cng pump'],
    keywords: ['petrol', 'diesel', 'fuel', 'cng'],
  },

  // 5. Shopping
  {
    canonicalName: 'Amazon',
    category: 'SHOPPING',
    aliases: ['amazon', 'amazon pay', 'amazon seller', 'amzn'],
    keywords: ['amazon'],
  },
  {
    canonicalName: 'Flipkart',
    category: 'SHOPPING',
    aliases: ['flipkart', 'flipkart internet'],
    keywords: ['flipkart'],
  },
  {
    canonicalName: 'Myntra',
    category: 'SHOPPING',
    aliases: ['myntra', 'myntra designs'],
    keywords: ['myntra'],
  },
  {
    canonicalName: 'Ajio',
    category: 'SHOPPING',
    aliases: ['ajio', 'reliance retail ajio'],
    keywords: ['ajio'],
  },
  {
    canonicalName: 'Nykaa',
    category: 'SHOPPING',
    aliases: ['nykaa', 'fsn e-commerce'],
    keywords: ['nykaa'],
  },
  {
    canonicalName: 'Croma',
    category: 'SHOPPING',
    aliases: ['croma', 'infiniti retail'],
    keywords: ['croma'],
  },
  {
    canonicalName: 'Vijay Sales',
    category: 'SHOPPING',
    aliases: ['vijay sales'],
    keywords: ['vijay sales'],
  },
  {
    canonicalName: 'Tata CLiQ',
    category: 'SHOPPING',
    aliases: ['tata cliq', 'tatacliq', 'tata unistore'],
    keywords: ['tata cliq'],
  },

  // 6. Bills & Utilities
  {
    canonicalName: 'Electricity & Power',
    category: 'BILLS_UTILITIES',
    aliases: ['electricity', 'msedcl', 'bses', 'bescom', 'adani electricity', 'tata power', 'tneb', 'wbbsedcl'],
    keywords: ['electricity bill', 'power bill', 'msedcl', 'bses', 'bescom'],
  },
  {
    canonicalName: 'Airtel',
    category: 'BILLS_UTILITIES',
    aliases: ['airtel', 'bharti airtel', 'airtel broadband'],
    keywords: ['airtel'],
  },
  {
    canonicalName: 'Jio',
    category: 'BILLS_UTILITIES',
    aliases: ['jio', 'reliance jio', 'jio fiber'],
    keywords: ['jio recharge', 'jio fiber'],
  },
  {
    canonicalName: 'Vi (Vodafone Idea)',
    category: 'BILLS_UTILITIES',
    aliases: ['vodafone', 'idea', 'vi recharge'],
    keywords: ['vodafone', 'vi recharge'],
  },
  {
    canonicalName: 'Gas & Water Utilities',
    category: 'BILLS_UTILITIES',
    aliases: ['indraprastha gas', 'igl', 'mahanagar gas', 'mgl', 'adani gas', 'water board', 'dth', 'tata play', 'dish tv'],
    keywords: ['gas bill', 'water bill', 'dth recharge', 'tata play'],
  },

  // 7. Entertainment & Subscriptions
  {
    canonicalName: 'Netflix',
    category: 'ENTERTAINMENT_SUBSCRIPTIONS',
    aliases: ['netflix', 'netflix entertainment'],
    keywords: ['netflix'],
  },
  {
    canonicalName: 'Spotify',
    category: 'ENTERTAINMENT_SUBSCRIPTIONS',
    aliases: ['spotify', 'spotify india'],
    keywords: ['spotify'],
  },
  {
    canonicalName: 'YouTube Premium',
    category: 'ENTERTAINMENT_SUBSCRIPTIONS',
    aliases: ['youtube', 'google youtube', 'youtube premium'],
    keywords: ['youtube premium'],
  },
  {
    canonicalName: 'JioHotstar / Disney+',
    category: 'ENTERTAINMENT_SUBSCRIPTIONS',
    aliases: ['hotstar', 'disney', 'jiohotstar', 'novi digital'],
    keywords: ['hotstar'],
  },
  {
    canonicalName: 'BookMyShow',
    category: 'ENTERTAINMENT_SUBSCRIPTIONS',
    aliases: ['bookmyshow', 'bigtree entertainment'],
    keywords: ['bookmyshow'],
  },
  {
    canonicalName: 'Gaming Services',
    category: 'ENTERTAINMENT_SUBSCRIPTIONS',
    aliases: ['playstation', 'steam', 'sony interactive', 'valve'],
    keywords: ['playstation', 'steam'],
  },

  // 8. Travel
  {
    canonicalName: 'MakeMyTrip',
    category: 'TRAVEL',
    aliases: ['makemytrip', 'mmt'],
    keywords: ['makemytrip'],
  },
  {
    canonicalName: 'Goibibo',
    category: 'TRAVEL',
    aliases: ['goibibo', 'ibibo group'],
    keywords: ['goibibo'],
  },
  {
    canonicalName: 'IRCTC',
    category: 'TRAVEL',
    aliases: ['irctc', 'indian railway catering'],
    keywords: ['irctc', 'railway ticket'],
  },
  {
    canonicalName: 'Airlines',
    category: 'TRAVEL',
    aliases: ['indigo', 'air india', 'spicejet', 'akasa', 'vistara'],
    keywords: ['indigo flight', 'air india', 'spicejet'],
  },

  // 9. Healthcare
  {
    canonicalName: 'Apollo',
    category: 'HEALTHCARE',
    aliases: ['apollo pharmacy', 'apollo hospitals', 'apollo 247'],
    keywords: ['apollo pharmacy', 'apollo hospital'],
  },
  {
    canonicalName: '1mg / Tata 1mg',
    category: 'HEALTHCARE',
    aliases: ['1mg', 'tata 1mg'],
    keywords: ['1mg'],
  },
  {
    canonicalName: 'PharmEasy',
    category: 'HEALTHCARE',
    aliases: ['pharmeasy', 'api holdings'],
    keywords: ['pharmeasy'],
  },
  {
    canonicalName: 'Medical Generic',
    category: 'HEALTHCARE',
    aliases: ['pharmacy', 'hospital', 'clinic', 'chemist', 'diagnostic', 'medicals'],
    keywords: ['pharmacy', 'hospital', 'clinic', 'chemist', 'diagnostic'],
  },

  // 10. Education
  {
    canonicalName: 'Education Platforms',
    category: 'EDUCATION',
    aliases: ['udemy', 'coursera', 'unacademy', 'byjus', 'physics wallah', 'allen career'],
    keywords: ['udemy', 'coursera', 'unacademy', 'tuition fee', 'school fee', 'college fee'],
  },

  // 11. Investments
  {
    canonicalName: 'Groww',
    category: 'INVESTMENT_SAVINGS',
    aliases: ['groww', 'nextbillion technology'],
    keywords: ['groww'],
  },
  {
    canonicalName: 'Zerodha',
    category: 'INVESTMENT_SAVINGS',
    aliases: ['zerodha', 'zerodha broking'],
    keywords: ['zerodha'],
  },
  {
    canonicalName: 'Investment Generic',
    category: 'INVESTMENT_SAVINGS',
    aliases: ['mutual fund', 'sip', 'upstox', 'angel one', 'coin', 'kuvera'],
    keywords: ['mutual fund', 'sip installment', 'investment'],
  },

  // 12. Insurance
  {
    canonicalName: 'Insurance Providers',
    category: 'INSURANCE',
    aliases: ['lic', 'hdfc life', 'icici prudential', 'sbi life', 'star health', 'max life', 'policybazaar'],
    keywords: ['insurance premium', 'policy premium', 'lic premium', 'health insurance'],
  },

  // 13. Personal Care
  {
    canonicalName: 'Urban Company',
    category: 'PERSONAL_CARE',
    aliases: ['urban company', 'urbanclap'],
    keywords: ['urban company'],
  },
  {
    canonicalName: 'Salon & Grooming',
    category: 'PERSONAL_CARE',
    aliases: ['salon', 'barber', 'spa', 'enrich', 'naturals salon', 'geetanjali salon'],
    keywords: ['salon', 'barber', 'spa haircut'],
  },
];
