import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  COLORS,
  GRADIENT_DASH,
  GRADIENT_BTN,
  GRADIENT_CAL,
  GRADIENT_PROTEIN,
  GRADIENT_CARBS,
  GRADIENT_FAT,
} from '../constants/colors';
import { DailyLog, NutritionGoals, DEFAULT_GOALS } from '../types/nutrition';
import { getTodayLog, getNutritionGoals, getWeekLogs, updateWater } from '../services/mealStorage';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48 - 12) / 2;

function greeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name.split(' ')[0]} 👋`;
}

function dateLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface MacroCardProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  colors: readonly [string, string, ...string[]];
  icon: keyof typeof Ionicons.glyphMap;
}

function MacroCard({ label, value, target, unit, colors, icon }: MacroCardProps) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <View style={macroStyles.card}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={macroStyles.iconBadge}
      >
        <Ionicons name={icon} size={18} color={COLORS.white} />
      </LinearGradient>
      <Text style={macroStyles.label}>{label}</Text>
      <Text style={macroStyles.value}>
        {value}
        <Text style={macroStyles.unit}> {unit}</Text>
      </Text>
      <View style={macroStyles.track}>
        <View style={[macroStyles.fill, { width: `${pct * 100}%`, backgroundColor: colors[0] }]} />
      </View>
      <Text style={macroStyles.sub}>of {target}{unit}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 18,
    padding: 16,
    width: CARD_W,
    marginBottom: 12,
  },
  iconBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  label: {
    color: COLORS.whiteAlpha60, fontSize: 12, fontWeight: '500',
    marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  value: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  unit: { fontSize: 13, fontWeight: '400', color: COLORS.whiteAlpha60 },
  track: {
    height: 4, backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 2, marginTop: 10, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
  sub: { color: COLORS.whiteAlpha40, fontSize: 11, marginTop: 4 },
});

interface WaterGlassProps { filled: boolean; onPress: () => void; }
function WaterGlass({ filled, onPress }: WaterGlassProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={waterStyles.glass}>
      <Ionicons
        name={filled ? 'water' : 'water-outline'}
        size={22}
        color={filled ? '#38BDF8' : COLORS.whiteAlpha40}
      />
    </TouchableOpacity>
  );
}
const waterStyles = StyleSheet.create({
  glass: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});

export default function DashboardScreen() {
  const { user, userProfile, logOut } = useAuth();
  const navigation = useNavigation<any>();

  const displayName = userProfile?.name ?? user?.displayName ?? user?.email?.split('@')[0] ?? 'Athlete';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('');

  const [log, setLog] = useState<DailyLog | null>(null);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [todayLog, userGoals, weekLogs] = await Promise.all([
        getTodayLog(user.uid),
        getNutritionGoals(user.uid),
        getWeekLogs(user.uid),
      ]);
      setLog(todayLog);
      setGoals(userGoals);

      // Compute consecutive logged days from today backwards
      const today = new Date();
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = weekLogs.find((l) => l.date === dateStr && l.totalCalories > 0);
        if (found) count++;
        else if (i === 0) break; // today not logged yet — streak still valid from yesterday
        else break;
      }
      setStreak(count);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggleWater = async (idx: number) => {
    if (!user) return;
    const current = log?.waterGlasses ?? 0;
    const newVal = idx < current ? idx : idx + 1;
    const updatedLog = { ...(log ?? emptyLog()), waterGlasses: newVal };
    setLog(updatedLog as DailyLog);
    await updateWater(user.uid, newVal);
  };

  const calories = {
    consumed: log?.totalCalories ?? 0,
    target: goals.dailyCalories,
  };
  const calPct = goals.dailyCalories > 0 ? Math.min(calories.consumed / goals.dailyCalories, 1) : 0;
  const calRemaining = Math.max(0, goals.dailyCalories - calories.consumed);
  const waterGlasses = log?.waterGlasses ?? 0;

  if (loading) {
    return (
      <LinearGradient colors={GRADIENT_DASH} style={styles.bg}>
        <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color={COLORS.crimson} size="large" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENT_DASH} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <View style={styles.greetBlock}>
              <Text style={styles.greetText}>{greeting(displayName)}</Text>
              <Text style={styles.dateText}>{dateLabel()}</Text>
            </View>
            <View style={styles.topRight}>
              <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={22} color={COLORS.whiteAlpha80} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} activeOpacity={0.8}>
                {userProfile?.photoURL ? (
                  <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImg} />
                ) : (
                  <LinearGradient colors={GRADIENT_BTN} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Calorie spotlight card ── */}
          <View style={styles.spotlightCard}>
            <View style={styles.spotlightLeft}>
              <Text style={styles.spotlightTitle}>Today's Calories</Text>
              <View style={styles.calRow}>
                <Text style={styles.calNumber}>{calories.consumed.toLocaleString()}</Text>
                <Text style={styles.calTarget}> / {calories.target.toLocaleString()} kcal</Text>
              </View>
              <View style={styles.calTrack}>
                <LinearGradient
                  colors={calPct >= 1 ? ['#FF6B6B', '#FF3B30'] : GRADIENT_CAL}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.calFill, { width: `${calPct * 100}%` }]}
                />
              </View>
              <Text style={styles.calRemaining}>
                {calories.consumed >= calories.target
                  ? `${calories.consumed - calories.target} kcal over goal`
                  : `${calRemaining} kcal remaining`}
              </Text>
            </View>
            <View style={styles.spotlightRight}>
              <View style={styles.ringOuter}>
                <View
                  style={[
                    styles.ringInner,
                    {
                      borderColor: calPct >= 1
                        ? COLORS.error
                        : `rgba(220,20,60,${0.2 + calPct * 0.6})`,
                    },
                  ]}
                >
                  <Text style={styles.ringPct}>{Math.round(calPct * 100)}%</Text>
                  <Text style={styles.ringLabel}>done</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Macros grid ── */}
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <View style={styles.macroGrid}>
            <MacroCard
              label="Protein"
              value={log?.totalProtein ?? 0}
              target={goals.dailyProtein}
              unit="g"
              colors={GRADIENT_PROTEIN}
              icon="fitness-outline"
            />
            <MacroCard
              label="Carbs"
              value={log?.totalCarbs ?? 0}
              target={goals.dailyCarbs}
              unit="g"
              colors={GRADIENT_CARBS}
              icon="leaf-outline"
            />
            <MacroCard
              label="Fat"
              value={log?.totalFat ?? 0}
              target={goals.dailyFat}
              unit="g"
              colors={GRADIENT_FAT}
              icon="flame-outline"
            />
            <MacroCard
              label="Streak"
              value={streak}
              target={7}
              unit=" days"
              colors={['#F59E0B', '#D97706']}
              icon="trophy-outline"
            />
          </View>

          {/* ── Water tracker ── */}
          <View style={styles.waterCard}>
            <View style={styles.waterHeader}>
              <Ionicons name="water" size={20} color="#38BDF8" />
              <Text style={styles.waterTitle}>Hydration</Text>
              <Text style={styles.waterCount}>{waterGlasses} / {goals.dailyWater} glasses</Text>
            </View>
            <View style={styles.waterGlasses}>
              {Array.from({ length: goals.dailyWater }).map((_, i) => (
                <WaterGlass
                  key={i}
                  filled={i < waterGlasses}
                  onPress={() => toggleWater(i)}
                />
              ))}
            </View>
            <View style={styles.waterTrack}>
              <View style={[styles.waterFill, { width: `${(waterGlasses / goals.dailyWater) * 100}%` }]} />
            </View>
          </View>

          {/* ── Quick actions ── */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Nutrition', { screen: 'FoodScan' })}
            >
              <LinearGradient
                colors={GRADIENT_CAL}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGrad}
              >
                <Ionicons name="camera-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionText}>Scan Food</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Nutrition', { screen: 'NutritionChat' })}
            >
              <LinearGradient
                colors={GRADIENT_CARBS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGrad}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionText}>AI Coach</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Nutrition', { screen: 'AddFood' })}
            >
              <LinearGradient
                colors={GRADIENT_PROTEIN}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGrad}
              >
                <Ionicons name="add-circle-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionText}>Log Meal</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Nutrition', { screen: 'MealHistory' })}
            >
              <LinearGradient
                colors={GRADIENT_FAT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGrad}
              >
                <Ionicons name="bar-chart-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionText}>History</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Today's meals summary ── */}
          {(log?.meals ?? []).filter((m) => m.items.length > 0).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Today's Meals</Text>
              <View style={styles.mealsCard}>
                {log!.meals.filter((m) => m.items.length > 0).map((meal) => (
                  <View key={meal.id} style={styles.mealRow}>
                    <Text style={styles.mealEmoji}>
                      {meal.type === 'breakfast' ? '🌅' : meal.type === 'lunch' ? '☀️' : meal.type === 'dinner' ? '🌙' : '🍎'}
                    </Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.mealType}>{meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}</Text>
                      <Text style={styles.mealItems} numberOfLines={1}>
                        {meal.items.map((i) => i.name).join(', ')}
                      </Text>
                    </View>
                    <Text style={styles.mealCal}>{meal.totalCalories} kcal</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => navigation.navigate('Nutrition')}
                >
                  <Text style={styles.viewAllText}>View full log →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Sign Out ── */}
          <TouchableOpacity onPress={logOut} style={styles.signOutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={16} color={COLORS.whiteAlpha40} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function emptyLog() {
  const date = new Date().toISOString().split('T')[0];
  return { date, meals: [], waterGlasses: 0, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22,
  },
  greetBlock: { flex: 1 },
  greetText: { color: COLORS.white, fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },
  dateText: { color: COLORS.whiteAlpha60, fontSize: 13, marginTop: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 44, height: 44, borderRadius: 13 },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },

  spotlightCard: {
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center',
    marginBottom: 22,
    shadowColor: COLORS.crimson, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  spotlightLeft: { flex: 1 },
  spotlightTitle: {
    color: COLORS.whiteAlpha60, fontSize: 12, fontWeight: '600',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  calRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  calNumber: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  calTarget: { color: COLORS.whiteAlpha60, fontSize: 14 },
  calTrack: {
    height: 6, backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  calFill: { height: '100%', borderRadius: 3 },
  calRemaining: { color: COLORS.whiteAlpha60, fontSize: 12 },
  spotlightRight: { marginLeft: 16 },
  ringOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.whiteAlpha08, alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  ringPct: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  ringLabel: { color: COLORS.whiteAlpha60, fontSize: 10, marginTop: -2 },

  sectionTitle: {
    color: COLORS.white, fontSize: 16, fontWeight: '700',
    marginBottom: 14, letterSpacing: 0.3,
  },

  macroGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: 22,
  },

  waterCard: {
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 22, padding: 18, marginBottom: 22,
  },
  waterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  waterTitle: { color: COLORS.white, fontWeight: '700', fontSize: 15, flex: 1 },
  waterCount: { color: '#38BDF8', fontWeight: '600', fontSize: 13 },
  waterGlasses: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  waterTrack: { height: 4, backgroundColor: COLORS.whiteAlpha08, borderRadius: 2, overflow: 'hidden' },
  waterFill: { height: '100%', backgroundColor: '#38BDF8', borderRadius: 2 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  actionGrad: {
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  actionText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },

  mealsCard: {
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, marginBottom: 22,
  },
  mealRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.whiteAlpha08,
  },
  mealEmoji: { fontSize: 20, width: 28 },
  mealType: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  mealItems: { color: COLORS.whiteAlpha40, fontSize: 12, marginTop: 1 },
  mealCal: { color: COLORS.whiteAlpha60, fontSize: 13, fontWeight: '600' },
  viewAllBtn: { paddingVertical: 10, alignItems: 'center' },
  viewAllText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, marginTop: 4, opacity: 0.7,
  },
  signOutText: { color: COLORS.whiteAlpha40, fontSize: 13 },
});
