export type HealthScore = 1 | 2 | 3 | 4 | 5;

export const HEALTH_SCORE_LABELS: Record<HealthScore, string> = {
  1: 'Very Unhealthy',
  2: 'Unhealthy',
  3: 'Moderate',
  4: 'Healthy',
  5: 'Super Healthy',
};

export const HEALTH_SCORE_COLORS: Record<HealthScore, string> = {
  1: '#FF3B30',
  2: '#FF9500',
  3: '#FFCC00',
  4: '#30D158',
  5: '#00C7BE',
};

export const HEALTH_SCORE_EMOJIS: Record<HealthScore, string> = {
  1: '⚠️',
  2: '😐',
  3: '👍',
  4: '✅',
  5: '🌟',
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  macros: Macros;
  healthScore: HealthScore;
  healthReason: string;
  tips?: string;
  servingSize?: string;
  imageUri?: string;
  addedAt: number;
}

export interface MealEntry {
  id: string;
  type: MealType;
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  loggedAt: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: MealEntry[];
  waterGlasses: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface NutritionGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyWater: number; // glasses
}

export interface FoodAnalysisResult {
  name: string;
  macros: Macros;
  healthScore: HealthScore;
  healthReason: string;
  tips: string;
  servingSize: string;
  ingredients?: string[];
  allergens?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolActions?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_GOALS: NutritionGoals = {
  dailyCalories: 2000,
  dailyProtein: 150,
  dailyCarbs: 250,
  dailyFat: 65,
  dailyWater: 8,
};
