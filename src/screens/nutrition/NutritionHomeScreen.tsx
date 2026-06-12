import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, GRADIENT_BTN } from '../../constants/colors';
import {
  DailyLog,
  MealEntry,
  MealType,
  NutritionGoals,
  DEFAULT_GOALS,
  HealthScore,
  HEALTH_SCORE_COLORS,
  HEALTH_SCORE_EMOJIS,
  HEALTH_SCORE_LABELS,
} from '../../types/nutrition';
import { getLogForDate, updateWater, getNutritionGoals, removeFoodFromMeal } from '../../services/mealStorage';

const MEAL_META: Record<MealType, { label: string; icon: string; time: string; color: string; gradient: string[] }> = {
  breakfast: { label: 'Breakfast', icon: '🌅', time: '7 – 9 AM',   color: '#DC143C', gradient: ['#DC143C', '#9B0A26'] },
  lunch:     { label: 'Lunch',     icon: '☀️', time: '12 – 2 PM',  color: '#F97316', gradient: ['#F97316', '#B45309'] },
  dinner:    { label: 'Dinner',    icon: '🌙', time: '6 – 8 PM',   color: '#A855F7', gradient: ['#7B2FBE', '#3B0764'] },
  snack:     { label: 'Snack',     icon: '🍎', time: 'Anytime',    color: '#22C55E', gradient: ['#22C55E', '#1A7A4A'] },
};

const PAST_DAYS = 29;
const FUTURE_DAYS = 7;
const TOTAL_DAYS = PAST_DAYS + 1 + FUTURE_DAYS;
const TODAY_IDX = PAST_DAYS;
const ITEM_W = 54;
const ITEM_MX = 3; // margin each side

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatHeaderDate(dateStr: string): string {
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  const diffMs = new Date(today).getTime() - d.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays > 0 && diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ─── Date Strip ─────────────────────────────────────────────────────────── */
function DateStrip({ selectedDate, onSelect }: { selectedDate: string; onSelect: (d: string) => void }) {
  const listRef = useRef<FlatList>(null);
  const today = useMemo(() => todayStr(), []);

  const dates = useMemo(() => {
    const now = new Date();
    return Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - TODAY_IDX + i);
      return d.toISOString().split('T')[0];
    });
  }, []);

  useEffect(() => {
    const idx = dates.indexOf(selectedDate);
    if (idx < 0) return;
    setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
      } catch {}
    }, 120);
  }, [selectedDate, dates]);

  return (
    <FlatList
      ref={listRef}
      data={dates}
      horizontal
      keyExtractor={(d) => d}
      showsHorizontalScrollIndicator={false}
      getItemLayout={(_, index) => ({
        length: ITEM_W + ITEM_MX * 2,
        offset: (ITEM_W + ITEM_MX * 2) * index,
        index,
      })}
      onScrollToIndexFailed={() => {}}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      style={{ marginBottom: 12 }}
      renderItem={({ item }) => {
        const date = new Date(item + 'T00:00:00');
        const isSelected = item === selectedDate;
        const isToday = item === today;
        const isFuture = item > today;
        const dayName = isToday
          ? 'Today'
          : date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });

        return (
          <TouchableOpacity
            style={[
              styles.dateItem,
              { width: ITEM_W, marginHorizontal: ITEM_MX },
              isSelected && styles.dateItemSelected,
              isFuture && styles.dateItemFuture,
            ]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            {isSelected && (
              <LinearGradient
                colors={GRADIENT_BTN as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[
              styles.dateDayName,
              isSelected && styles.dateTextActive,
              isFuture && !isSelected && styles.dateFutureText,
            ]}>
              {dayName}
            </Text>
            <Text style={[
              styles.dateDayNum,
              isSelected && styles.dateTextActive,
              isFuture && !isSelected && styles.dateFutureText,
            ]}>
              {dayNum}
            </Text>
            {isToday && !isSelected && <View style={styles.todayDot} />}
            {!isToday && (
              <Text style={[
                styles.dateMonth,
                isSelected && styles.dateTextActive,
                isFuture && !isSelected && styles.dateFutureText,
              ]}>
                {monthName}
              </Text>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

/* ─── MacroBar ───────────────────────────────────────────────────────────── */
function MacroBar({ label, value, goal, unit, colors }: { label: string; value: number; goal: number; unit: string; colors: string[] }) {
  const pct = Math.min(1, goal > 0 ? value / goal : 0);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [pct]);

  const width = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={mbar.wrap}>
      <View style={mbar.header}>
        <Text style={mbar.label}>{label}</Text>
        <Text style={mbar.value}>{value}<Text style={mbar.goal}>/{goal}{unit}</Text></Text>
      </View>
      <View style={mbar.track}>
        <Animated.View style={[mbar.fill, { width }]}>
          <LinearGradient colors={colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
    </View>
  );
}

const mbar = StyleSheet.create({
  wrap: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: COLORS.whiteAlpha60, fontSize: 13, fontWeight: '500' },
  value: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  goal: { color: COLORS.whiteAlpha40, fontWeight: '400' },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

/* ─── MacroPill ──────────────────────────────────────────────────────────── */
function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.macroPillText, { color }]}>{label} {value}g</Text>
    </View>
  );
}

/* ─── CalStat ────────────────────────────────────────────────────────────── */
function CalStat({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View style={styles.calStatRow}>
      <Ionicons name={icon} size={16} color={color} />
      <View style={{ marginLeft: 8 }}>
        <Text style={styles.calStatLabel}>{label}</Text>
        <Text style={styles.calStatValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ─── QuickAction ────────────────────────────────────────────────────────── */
function QuickAction({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.qaBtn} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qaIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ─── MealCard ───────────────────────────────────────────────────────────── */
function MealCard({
  type, meal, meta, dailyCalories, onScanFood, onAddFood, onRemoveFood,
}: {
  type: MealType;
  meal: MealEntry | null;
  meta: { label: string; icon: string; time: string; color: string; gradient: string[] };
  dailyCalories: number;
  onScanFood: () => void;
  onAddFood: () => void;
  onRemoveFood: (foodId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasItems = (meal?.items?.length ?? 0) > 0;
  const mealCals = meal?.totalCalories ?? 0;
  const mealProt = meal?.totalProtein ?? 0;
  const mealCarbs = meal?.totalCarbs ?? 0;
  const mealFat = meal?.totalFat ?? 0;
  const calPct = dailyCalories > 0 && mealCals > 0 ? Math.round((mealCals / dailyCalories) * 100) : 0;

  return (
    <View style={styles.mealCard}>
      <View style={[styles.mealAccent, { backgroundColor: meta.color }]} />
      <View style={styles.mealContent}>
        <TouchableOpacity style={styles.mealHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
          <View style={styles.mealLeft}>
            <Text style={{ fontSize: 26 }}>{meta.icon}</Text>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.mealLabel}>{meta.label}</Text>
              <Text style={styles.mealTime}>{meta.time}</Text>
            </View>
          </View>
          <View style={styles.mealRight}>
            {mealCals > 0 && (
              <View style={[styles.mealCalBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                <Text style={[styles.mealCalBadgeText, { color: meta.color }]}>{mealCals} kcal</Text>
              </View>
            )}
            <TouchableOpacity style={styles.mealScanBtn} onPress={onScanFood} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="camera-outline" size={17} color={COLORS.whiteAlpha60} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mealScanBtn, styles.mealAddActive, { backgroundColor: meta.color }]}
              onPress={onAddFood}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={19} color={COLORS.white} />
            </TouchableOpacity>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.whiteAlpha40} style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>

        {hasItems && (
          <View style={styles.mealMacroRow}>
            <MacroPill label="P" value={mealProt} color={COLORS.green} />
            <MacroPill label="C" value={mealCarbs} color={COLORS.purpleLight} />
            <MacroPill label="F" value={mealFat} color="#F97316" />
            {calPct > 0 && (
              <View style={styles.mealPctChip}>
                <Text style={styles.mealPctText}>{calPct}% of day</Text>
              </View>
            )}
          </View>
        )}

        {expanded && hasItems && (
          <View style={styles.mealItems}>
            {meal!.items.map((item) => (
              <View key={item.id} style={styles.foodRow}>
                <View style={[styles.healthDot, { backgroundColor: HEALTH_SCORE_COLORS[item.healthScore] }]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.foodNameRow}>
                    <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: 13, marginLeft: 4 }}>{HEALTH_SCORE_EMOJIS[item.healthScore]}</Text>
                  </View>
                  <Text style={styles.foodMacros}>
                    {item.macros.calories} kcal · {item.macros.protein}g P · {item.macros.carbs}g C · {item.macros.fat}g F
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onRemoveFood(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }}>
                  <Ionicons name="close-circle-outline" size={18} color={COLORS.whiteAlpha40} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {expanded && !hasItems && (
          <View style={styles.emptyMealBody}>
            <Text style={styles.emptyMealHint}>Nothing logged for {meta.label.toLowerCase()} yet</Text>
            <View style={styles.emptyMealActions}>
              <TouchableOpacity style={styles.emptyMealScanBtn} onPress={onScanFood} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={16} color={COLORS.white} />
                <Text style={styles.emptyMealBtnText}>Scan Food</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.emptyMealAddBtn, { backgroundColor: meta.color }]} onPress={onAddFood} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={16} color={COLORS.white} />
                <Text style={styles.emptyMealBtnText}>Add Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/* ─── Macro Distribution card ────────────────────────────────────────────── */
function MacroDistributionCard({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const totalCals = protein * 4 + carbs * 4 + fat * 9;
  if (totalCals === 0) return null;
  const protPct = Math.round((protein * 4 / totalCals) * 100);
  const carbsPct = Math.round((carbs * 4 / totalCals) * 100);
  const fatPct = Math.max(0, 100 - protPct - carbsPct);

  return (
    <View style={styles.card}>
      <Text style={styles.cardInnerTitle}>Macro Distribution</Text>
      <View style={styles.macroDistBar}>
        {protPct > 0 && <View style={[styles.macroDistSeg, { flex: protPct, backgroundColor: COLORS.green }]} />}
        {carbsPct > 0 && <View style={[styles.macroDistSeg, { flex: carbsPct, backgroundColor: COLORS.purpleLight }]} />}
        {fatPct > 0 && <View style={[styles.macroDistSeg, { flex: Math.max(fatPct, 1), backgroundColor: '#F97316' }]} />}
      </View>
      <View style={styles.macroDistLegend}>
        <DistItem color={COLORS.green}      label="Protein" pct={protPct}  grams={protein} />
        <DistItem color={COLORS.purpleLight} label="Carbs"   pct={carbsPct} grams={carbs} />
        <DistItem color="#F97316"            label="Fat"     pct={fatPct}   grams={fat} />
      </View>
    </View>
  );
}

function DistItem({ color, label, pct, grams }: { color: string; label: string; pct: number; grams: number }) {
  return (
    <View style={styles.distItem}>
      <View style={[styles.distDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.distLabel}>{label}</Text>
        <Text style={styles.distValue}>{grams}g · {pct}%</Text>
      </View>
    </View>
  );
}

/* ─── Nutrition Insights card ────────────────────────────────────────────── */
function NutritionInsightsCard({ log }: { log: DailyLog | null }) {
  if (!log) return null;
  const allItems = log.meals.flatMap((m) => m.items);
  if (allItems.length === 0) return null;
  const avgRaw = allItems.reduce((s, i) => s + i.healthScore, 0) / allItems.length;
  const avgScore = Math.max(1, Math.min(5, Math.round(avgRaw))) as HealthScore;
  const mealsWithItems = log.meals.filter((m) => m.items.length > 0);
  const topMeal = mealsWithItems.sort((a, b) => b.totalCalories - a.totalCalories)[0];
  const protOk = (log.totalProtein ?? 0) >= 50;

  return (
    <View style={styles.card}>
      <Text style={styles.cardInnerTitle}>Insights</Text>
      <View style={styles.insightsGrid}>
        <InsightTile emoji={HEALTH_SCORE_EMOJIS[avgScore]} title="Avg Health"  value={HEALTH_SCORE_LABELS[avgScore]}                  tintColor={HEALTH_SCORE_COLORS[avgScore]} />
        <InsightTile emoji="🍽️"                             title="Logged"     value={`${allItems.length} item${allItems.length !== 1 ? 's' : ''}`} tintColor={COLORS.purpleLight} />
        <InsightTile emoji="🔥"                             title="Top Meal"   value={topMeal ? MEAL_META[topMeal.type as MealType].label : '–'} tintColor={COLORS.crimson} />
        <InsightTile emoji={protOk ? '💪' : '⚠️'}          title="Protein"    value={protOk ? 'On Track' : 'Needs More'}             tintColor={protOk ? COLORS.green : '#F97316'} />
      </View>
    </View>
  );
}

function InsightTile({ emoji, title, value, tintColor }: { emoji: string; title: string; value: string; tintColor: string }) {
  return (
    <View style={[styles.insightTile, { borderColor: tintColor + '33' }]}>
      <Text style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</Text>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={[styles.insightValue, { color: tintColor }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/* ─── Ring ───────────────────────────────────────────────────────────────── */
function Ring({ pct }: { pct: number }) {
  const size = 120;
  const stroke = 10;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: stroke, borderColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: size / 2, borderWidth: stroke,
        borderColor: 'transparent', borderTopColor: pct > 1 ? COLORS.error : COLORS.crimson,
        transform: [{ rotate: '-90deg' }],
      }]} />
    </View>
  );
}

/* ─── Main Screen ────────────────────────────────────────────────────────── */
export default function NutritionHomeScreen() {
  const nav = useNavigation<any>();
  const { user, userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr());
  const [log, setLog] = useState<DailyLog | null>(null);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core load: always takes the date explicitly
  const loadForDate = useCallback(async (date: string) => {
    if (!user) return;
    try {
      const [l, g] = await Promise.all([
        getLogForDate(user.uid, date),
        getNutritionGoals(user.uid),
      ]);
      setLog(l);
      setGoals(g);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Reload on screen focus (e.g. returning from FoodScan/AddFood)
  useFocusEffect(useCallback(() => {
    loadForDate(selectedDate);
  }, [loadForDate, selectedDate]));

  // Reload immediately when user changes the date
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setLoading(true);
    loadForDate(selectedDate);
  }, [selectedDate]); // intentionally omit loadForDate to avoid extra fires

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleWater = async (glasses: number) => {
    if (!user) return;
    const base = log ?? {
      date: selectedDate, meals: [], waterGlasses: 0,
      totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
    };
    setLog({ ...base, waterGlasses: glasses });
    await updateWater(user.uid, glasses, selectedDate);
  };

  const handleRemoveFood = async (mealType: MealType, foodId: string) => {
    if (!user) return;
    Alert.alert('Remove Food', 'Remove this item from your log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = await removeFoodFromMeal(user.uid, mealType, foodId, selectedDate);
          setLog(updated);
        },
      },
    ]);
  };

  const calPct = log && goals.dailyCalories > 0 ? Math.min(1, log.totalCalories / goals.dailyCalories) : 0;
  const calRemaining = Math.max(0, goals.dailyCalories - (log?.totalCalories ?? 0));
  const isToday = selectedDate === todayStr();
  const dateHeader = formatHeaderDate(selectedDate);

  if (loading) {
    return (
      <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={styles.loading}>
        <ActivityIndicator color={COLORS.crimson} size="large" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Good {getTimeGreeting()},</Text>
            <Text style={styles.name}>{userProfile?.name?.split(' ')[0] ?? 'there'} 👋</Text>
          </View>
          <TouchableOpacity style={styles.goalsBtn} onPress={() => nav.navigate('NutritionGoals')}>
            <Ionicons name="settings-outline" size={20} color={COLORS.whiteAlpha60} />
          </TouchableOpacity>
        </View>

        {/* ── Date Strip ── */}
        <DateStrip selectedDate={selectedDate} onSelect={handleSelectDate} />

        {/* ── Date Label (non-today) ── */}
        {!isToday && (
          <View style={styles.dateLabelRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.purpleLight} />
            <Text style={styles.dateLabelText}>{dateHeader}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadForDate(selectedDate); }}
              tintColor={COLORS.crimson}
            />
          }
        >
          {/* ── Calorie Overview ── */}
          <View style={styles.card}>
            <View style={styles.calRow}>
              <View style={styles.ringWrap}>
                <Ring pct={calPct} />
                <View style={styles.ringInner}>
                  <Text style={styles.ringCal}>{log?.totalCalories ?? 0}</Text>
                  <Text style={styles.ringLabel}>kcal</Text>
                </View>
              </View>
              <View style={styles.calStats}>
                <CalStat icon="flame-outline"            color={COLORS.crimson}     label="Goal"      value={`${goals.dailyCalories} kcal`} />
                <CalStat icon="checkmark-circle-outline" color={COLORS.green}       label="Consumed"  value={`${log?.totalCalories ?? 0} kcal`} />
                <CalStat icon="remove-circle-outline"    color={COLORS.purpleLight} label="Remaining" value={`${calRemaining} kcal`} />
              </View>
            </View>
            <View style={styles.divider} />
            <MacroBar label="Protein" value={log?.totalProtein ?? 0} goal={goals.dailyProtein} unit="g" colors={['#22C55E', '#1A7A4A']} />
            <MacroBar label="Carbs"   value={log?.totalCarbs ?? 0}   goal={goals.dailyCarbs}   unit="g" colors={['#7B2FBE', '#3B0764']} />
            <MacroBar label="Fat"     value={log?.totalFat ?? 0}     goal={goals.dailyFat}     unit="g" colors={['#F97316', '#B45309']} />
          </View>

          {/* ── Macro Distribution ── */}
          <MacroDistributionCard
            protein={log?.totalProtein ?? 0}
            carbs={log?.totalCarbs ?? 0}
            fat={log?.totalFat ?? 0}
          />

          {/* ── Quick Actions ── */}
          <Text style={styles.sectionTitle}>Log Food</Text>
          <View style={styles.actionsRow}>
            <QuickAction icon="camera-outline"              label="Scan Food"  color={COLORS.crimson} onPress={() => nav.navigate('FoodScan', { targetDate: selectedDate })} />
            <QuickAction icon="add-circle-outline"          label="Add Manual" color={COLORS.purple}  onPress={() => nav.navigate('AddFood', { targetDate: selectedDate })} />
            <QuickAction icon="chatbubble-ellipses-outline" label="AI Coach"   color={COLORS.green}   onPress={() => nav.navigate('NutritionChat', { targetDate: selectedDate })} />
            <QuickAction icon="bar-chart-outline"           label="History"    color="#F97316"        onPress={() => nav.navigate('MealHistory')} />
          </View>

          {/* ── Today's Meals ── */}
          <Text style={styles.sectionTitle}>{isToday ? "Today's" : dateHeader + "'s"} Meals</Text>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
            const meal = log?.meals.find((m) => m.type === type) ?? null;
            return (
              <MealCard
                key={type}
                type={type}
                meal={meal}
                meta={MEAL_META[type]}
                dailyCalories={goals.dailyCalories}
                onScanFood={() => nav.navigate('FoodScan', { mealType: type, targetDate: selectedDate })}
                onAddFood={() => nav.navigate('AddFood', { mealType: type, targetDate: selectedDate })}
                onRemoveFood={(foodId) => handleRemoveFood(type, foodId)}
              />
            );
          })}

          {/* ── Hydration ── */}
          <Text style={styles.sectionTitle}>Hydration</Text>
          <View style={styles.card}>
            <View style={styles.waterHeader}>
              <Text style={styles.waterTitle}>💧 Water Intake</Text>
              <Text style={styles.waterCount}>{log?.waterGlasses ?? 0}/{goals.dailyWater} glasses</Text>
            </View>
            <View style={styles.waterGrid}>
              {Array.from({ length: goals.dailyWater }).map((_, i) => {
                const filled = i < (log?.waterGlasses ?? 0);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleWater(filled ? i : i + 1)}
                    style={[styles.waterGlass, filled && styles.waterGlassFilled]}
                  >
                    <Text style={{ fontSize: 22 }}>{filled ? '💧' : '🫙'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Nutrition Insights ── */}
          <NutritionInsightsCard log={log} />

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 18, paddingTop: 4 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 },
  greeting: { color: COLORS.whiteAlpha60, fontSize: 13 },
  name: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  goalsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },

  /* Date strip */
  dateItem: {
    height: 68, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    gap: 2,
  },
  dateItemSelected: { borderColor: 'transparent' },
  dateItemFuture: { opacity: 0.45 },
  dateDayName: { color: COLORS.whiteAlpha60, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  dateDayNum: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  dateMonth: { color: COLORS.whiteAlpha40, fontSize: 9 },
  dateTextActive: { color: COLORS.white },
  dateFutureText: { color: COLORS.whiteAlpha40 },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.crimson, marginTop: 2 },

  /* Date label */
  dateLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 18, marginBottom: 8,
  },
  dateLabelText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 18, marginBottom: 20,
  },
  cardInnerTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 14 },

  calRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  ringWrap: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  ringInner: { position: 'absolute', alignItems: 'center' },
  ringCal: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  ringLabel: { color: COLORS.whiteAlpha60, fontSize: 11 },
  calStats: { flex: 1, gap: 12 },
  calStatRow: { flexDirection: 'row', alignItems: 'center' },
  calStatLabel: { color: COLORS.whiteAlpha60, fontSize: 11 },
  calStatValue: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.whiteAlpha08, marginBottom: 16 },

  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  qaBtn: { flex: 1, alignItems: 'center', gap: 8, padding: 4 },
  qaIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { color: COLORS.whiteAlpha60, fontSize: 11, fontWeight: '500', textAlign: 'center' },

  /* Meal cards */
  mealCard: {
    flexDirection: 'row', backgroundColor: COLORS.cardBg,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 12, overflow: 'hidden',
  },
  mealAccent: { width: 4 },
  mealContent: { flex: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealLeft: { flexDirection: 'row', alignItems: 'center' },
  mealLabel: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  mealTime: { color: COLORS.whiteAlpha40, fontSize: 11, marginTop: 1 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealCalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginRight: 2 },
  mealCalBadgeText: { fontSize: 12, fontWeight: '700' },
  mealScanBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  mealAddActive: { borderWidth: 0 },
  mealMacroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  macroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  macroPillText: { fontSize: 11, fontWeight: '600' },
  mealPctChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  mealPctText: { color: COLORS.whiteAlpha40, fontSize: 11 },
  mealItems: { paddingTop: 2, paddingBottom: 8 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: COLORS.whiteAlpha08 },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center' },
  foodName: { color: COLORS.white, fontSize: 13, fontWeight: '600', flex: 1 },
  foodMacros: { color: COLORS.whiteAlpha40, fontSize: 11, marginTop: 2 },
  emptyMealBody: { paddingVertical: 12, paddingBottom: 16 },
  emptyMealHint: { color: COLORS.whiteAlpha40, fontSize: 12, marginBottom: 10 },
  emptyMealActions: { flexDirection: 'row', gap: 8 },
  emptyMealScanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  emptyMealAddBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 12,
  },
  emptyMealBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  /* Macro Distribution */
  macroDistBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14, gap: 2 },
  macroDistSeg: { borderRadius: 3 },
  macroDistLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  distItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distLabel: { color: COLORS.whiteAlpha60, fontSize: 11 },
  distValue: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

  /* Hydration */
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  waterCount: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  waterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  waterGlass: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  waterGlassFilled: { backgroundColor: 'rgba(122, 47, 190, 0.25)' },

  /* Insights */
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  insightTile: { flex: 1, minWidth: '44%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
  insightTitle: { color: COLORS.whiteAlpha60, fontSize: 11, marginBottom: 2, textAlign: 'center' },
  insightValue: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
