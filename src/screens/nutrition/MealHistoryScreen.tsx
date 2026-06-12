import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { DailyLog, MealType, NutritionGoals, DEFAULT_GOALS } from '../../types/nutrition';
import { getWeekLogs, getNutritionGoals } from '../../services/mealStorage';
import { useAuth } from '../../context/AuthContext';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

export default function MealHistoryScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getWeekLogs(user.uid), getNutritionGoals(user.uid)]).then(([l, g]) => {
      setLogs(l);
      setGoals(g);
      if (l.length > 0) setExpandedDay(l[0].date);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={styles.loading}>
        <ActivityIndicator color={COLORS.crimson} size="large" />
      </LinearGradient>
    );
  }

  const weekly = logs.reduce((acc, l) => ({
    calories: acc.calories + l.totalCalories,
    protein: acc.protein + l.totalProtein,
    carbs: acc.carbs + l.totalCarbs,
    fat: acc.fat + l.totalFat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal History</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Weekly Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>7-Day Summary</Text>
            <View style={styles.summaryRow}>
              <SummaryChip label="Avg Calories" value={Math.round(weekly.calories / Math.max(1, logs.length))} unit="kcal" color={COLORS.crimson} />
              <SummaryChip label="Total Protein" value={weekly.protein} unit="g" color={COLORS.green} />
              <SummaryChip label="Total Carbs" value={weekly.carbs} unit="g" color={COLORS.purpleLight} />
              <SummaryChip label="Total Fat" value={weekly.fat} unit="g" color="#F97316" />
            </View>
          </View>

          {/* Calorie Chart */}
          {logs.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Daily Calories</Text>
              <View style={styles.chartCard}>
                <CalChart logs={[...logs].reverse()} goal={goals.dailyCalories} />
              </View>
            </>
          )}

          {/* Daily Logs */}
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {logs.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>🍽️</Text>
              <Text style={styles.emptyText}>No meals logged yet</Text>
              <Text style={styles.emptySubText}>Start logging your meals to see history here</Text>
            </View>
          )}
          {logs.map((log) => {
            const expanded = expandedDay === log.date;
            const calPct = Math.min(1, goals.dailyCalories > 0 ? log.totalCalories / goals.dailyCalories : 0);
            const isToday = log.date === new Date().toISOString().split('T')[0];
            return (
              <View key={log.date} style={styles.dayCard}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => setExpandedDay(expanded ? null : log.date)}
                  activeOpacity={0.75}
                >
                  <View>
                    <Text style={styles.dayDate}>{formatDate(log.date)}{isToday ? ' (Today)' : ''}</Text>
                    <Text style={styles.dayCal}>{log.totalCalories} kcal · {log.totalProtein}g P · {log.totalCarbs}g C · {log.totalFat}g F</Text>
                  </View>
                  <View style={styles.dayRight}>
                    <View style={styles.calPill}>
                      <View style={[styles.calPillFill, { width: `${Math.round(calPct * 100)}%`, backgroundColor: calPct > 1 ? COLORS.error : COLORS.crimson }]} />
                    </View>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.whiteAlpha40} style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>

                {expanded && log.meals.map((meal) => (
                  <View key={meal.type} style={styles.mealGroup}>
                    <Text style={styles.mealGroupTitle}>{MEAL_ICONS[meal.type as MealType]} {capitalize(meal.type)} · {meal.totalCalories} kcal</Text>
                    {meal.items.map((item) => (
                      <View key={item.id} style={styles.historyFoodRow}>
                        <Text style={styles.historyFoodName}>{item.name}</Text>
                        <Text style={styles.historyFoodCal}>{item.macros.calories} kcal</Text>
                      </View>
                    ))}
                  </View>
                ))}

                {expanded && log.waterGlasses > 0 && (
                  <View style={styles.waterRow}>
                    <Text style={styles.waterRowText}>💧 Water: {log.waterGlasses} glasses</Text>
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SummaryChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={schipStyles.wrap}>
      <Text style={[schipStyles.value, { color }]}>{value}</Text>
      <Text style={schipStyles.unit}>{unit}</Text>
      <Text style={schipStyles.label}>{label}</Text>
    </View>
  );
}

const schipStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', padding: 10 },
  value: { fontSize: 18, fontWeight: '800' },
  unit: { color: COLORS.whiteAlpha60, fontSize: 10, marginTop: 1 },
  label: { color: COLORS.whiteAlpha40, fontSize: 10, marginTop: 2, textAlign: 'center' },
});

function CalChart({ logs, goal }: { logs: DailyLog[]; goal: number }) {
  const maxCal = Math.max(goal, ...logs.map((l) => l.totalCalories), 1);
  return (
    <View style={chartStyles.container}>
      {logs.map((log, i) => {
        const pct = log.totalCalories / maxCal;
        const goalPct = goal / maxCal;
        const isToday = log.date === new Date().toISOString().split('T')[0];
        return (
          <View key={log.date} style={chartStyles.barWrap}>
            <View style={chartStyles.barTrack}>
              <View style={[chartStyles.barFill, {
                height: `${Math.round(pct * 100)}%`,
                backgroundColor: isToday ? COLORS.crimson : COLORS.purple + 'AA',
              }]} />
              <View style={[chartStyles.goalLine, { bottom: `${Math.round(goalPct * 100)}%` }]} />
            </View>
            <Text style={[chartStyles.barLabel, isToday && { color: COLORS.crimson }]}>
              {log.date.slice(5).replace('-', '/')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barWrap: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'visible', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 2 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: COLORS.whiteAlpha40 },
  barLabel: { color: COLORS.whiteAlpha40, fontSize: 9, textAlign: 'center' },
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 18 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  summaryCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 18, marginBottom: 24,
  },
  summaryTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 14 },
  summaryRow: { flexDirection: 'row' },

  chartCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 18, marginBottom: 24,
  },

  dayCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 10, overflow: 'hidden',
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  dayDate: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  dayCal: { color: COLORS.whiteAlpha60, fontSize: 12, marginTop: 2 },
  dayRight: { flexDirection: 'row', alignItems: 'center' },
  calPill: { width: 60, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  calPillFill: { height: '100%', borderRadius: 3 },

  mealGroup: { paddingHorizontal: 14, paddingBottom: 8 },
  mealGroupTitle: { color: COLORS.whiteAlpha80, fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  historyFoodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: COLORS.whiteAlpha08 },
  historyFoodName: { color: COLORS.whiteAlpha60, fontSize: 12, flex: 1 },
  historyFoodCal: { color: COLORS.whiteAlpha40, fontSize: 12 },
  waterRow: { paddingHorizontal: 14, paddingBottom: 10 },
  waterRowText: { color: COLORS.whiteAlpha40, fontSize: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  emptySubText: { color: COLORS.whiteAlpha40, fontSize: 13, textAlign: 'center' },
});
