import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyLog, MealEntry, FoodItem, MealType, NutritionGoals, DEFAULT_GOALS, ChatSession } from '../types/nutrition';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function emptyLog(date: string): DailyLog {
  return { date, meals: [], waterGlasses: 0, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
}

function recalcTotals(log: DailyLog): DailyLog {
  let cal = 0, pro = 0, carb = 0, fat = 0;
  for (const meal of log.meals) {
    cal += meal.totalCalories;
    pro += meal.totalProtein;
    carb += meal.totalCarbs;
    fat += meal.totalFat;
  }
  return { ...log, totalCalories: cal, totalProtein: pro, totalCarbs: carb, totalFat: fat };
}

export async function getLogForDate(uid: string, date: string): Promise<DailyLog> {
  const ref = doc(db, 'users', uid, 'dailyLogs', date);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as DailyLog) : emptyLog(date);
}

export async function getTodayLog(uid: string): Promise<DailyLog> {
  return getLogForDate(uid, todayStr());
}

export async function addFoodToMeal(
  uid: string,
  mealType: MealType,
  food: FoodItem,
  date?: string,
): Promise<DailyLog> {
  const date_ = date ?? todayStr();
  const ref = doc(db, 'users', uid, 'dailyLogs', date_);
  const snap = await getDoc(ref);
  let log: DailyLog = snap.exists() ? (snap.data() as DailyLog) : emptyLog(date_);

  let meal = log.meals.find((m) => m.type === mealType);
  if (!meal) {
    meal = {
      id: `${mealType}-${date_}`,
      type: mealType,
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      loggedAt: Date.now(),
    };
    log.meals.push(meal);
  }

  meal.items.push(food);
  meal.totalCalories += food.macros.calories;
  meal.totalProtein += food.macros.protein;
  meal.totalCarbs += food.macros.carbs;
  meal.totalFat += food.macros.fat;

  const updated = recalcTotals(log);
  await setDoc(ref, updated);
  return updated;
}

export async function removeFoodFromMeal(
  uid: string,
  mealType: MealType,
  foodId: string,
  date?: string,
): Promise<DailyLog> {
  const date_ = date ?? todayStr();
  const ref = doc(db, 'users', uid, 'dailyLogs', date_);
  const snap = await getDoc(ref);
  if (!snap.exists()) return emptyLog(date_);

  let log = snap.data() as DailyLog;
  log.meals = log.meals.map((meal) => {
    if (meal.type !== mealType) return meal;
    const items = meal.items.filter((i) => i.id !== foodId);
    const totalCalories = items.reduce((s, i) => s + i.macros.calories, 0);
    const totalProtein = items.reduce((s, i) => s + i.macros.protein, 0);
    const totalCarbs = items.reduce((s, i) => s + i.macros.carbs, 0);
    const totalFat = items.reduce((s, i) => s + i.macros.fat, 0);
    return { ...meal, items, totalCalories, totalProtein, totalCarbs, totalFat };
  });

  const updated = recalcTotals(log);
  await setDoc(ref, updated);
  return updated;
}

export async function updateWater(uid: string, glasses: number, date?: string): Promise<void> {
  const date_ = date ?? todayStr();
  const ref = doc(db, 'users', uid, 'dailyLogs', date_);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { waterGlasses: glasses });
  } else {
    await setDoc(ref, { ...emptyLog(date_), waterGlasses: glasses });
  }
}

export async function getWeekLogs(uid: string): Promise<DailyLog[]> {
  const logsRef = collection(db, 'users', uid, 'dailyLogs');
  const q = query(logsRef, orderBy('date', 'desc'), limit(7));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyLog);
}

export async function getNutritionGoals(uid: string): Promise<NutritionGoals> {
  const ref = doc(db, 'users', uid, 'settings', 'nutritionGoals');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as NutritionGoals) : DEFAULT_GOALS;
}

export async function saveNutritionGoals(uid: string, goals: NutritionGoals): Promise<void> {
  const ref = doc(db, 'users', uid, 'settings', 'nutritionGoals');
  await setDoc(ref, goals);
}

export async function saveChatSession(uid: string, session: ChatSession): Promise<void> {
  const ref = doc(db, 'users', uid, 'chatSessions', session.id);
  await setDoc(ref, session);
}

export async function getChatSessions(uid: string): Promise<ChatSession[]> {
  const ref = collection(db, 'users', uid, 'chatSessions');
  const q = query(ref, orderBy('updatedAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChatSession);
}

export async function getChatSession(uid: string, sessionId: string): Promise<ChatSession | null> {
  const ref = doc(db, 'users', uid, 'chatSessions', sessionId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as ChatSession) : null;
}

export async function deleteChatSession(uid: string, sessionId: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'chatSessions', sessionId);
  await deleteDoc(ref);
}
