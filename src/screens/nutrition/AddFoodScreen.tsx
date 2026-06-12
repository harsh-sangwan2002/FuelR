import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, GRADIENT_BTN } from '../../constants/colors';
import {
  FoodAnalysisResult,
  MealType,
  HEALTH_SCORE_LABELS,
  HEALTH_SCORE_COLORS,
  HEALTH_SCORE_EMOJIS,
} from '../../types/nutrition';
import { estimateFoodNutrition } from '../../services/nutritionAI';
import { addFoodToMeal } from '../../services/mealStorage';
import { useAuth } from '../../context/AuthContext';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const QUICK_FOODS = [
  'Oatmeal with berries', 'Grilled chicken breast', 'Brown rice', 'Greek yogurt',
  'Avocado toast', 'Protein shake', 'Caesar salad', 'Banana',
];

export default function AddFoodScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>(route.params?.mealType ?? 'lunch');
  const targetDate: string | undefined = route.params?.targetDate;
  const [logging, setLogging] = useState(false);

  const [editCal, setEditCal] = useState('');
  const [editPro, setEditPro] = useState('');
  const [editCarb, setEditCarb] = useState('');
  const [editFat, setEditFat] = useState('');

  const analyze = async (name?: string) => {
    const food = (name ?? query).trim();
    if (!food) return;
    setLoading(true);
    try {
      const r = await estimateFoodNutrition(food);
      setResult(r);
      setEditCal(String(r.macros.calories));
      setEditPro(String(r.macros.protein));
      setEditCarb(String(r.macros.carbs));
      setEditFat(String(r.macros.fat));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not analyze. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logFood = async () => {
    if (!result || !user) return;
    setLogging(true);
    try {
      const macros = {
        ...result.macros,
        calories: parseInt(editCal, 10) || result.macros.calories,
        protein: parseInt(editPro, 10) || result.macros.protein,
        carbs: parseInt(editCarb, 10) || result.macros.carbs,
        fat: parseInt(editFat, 10) || result.macros.fat,
      };
      await addFoodToMeal(user.uid, mealType, {
        id: Date.now().toString(),
        name: result.name,
        macros,
        healthScore: result.healthScore,
        healthReason: result.healthReason,
        tips: result.tips,
        servingSize: result.servingSize,
        addedAt: Date.now(),
      }, targetDate);
      nav.goBack();
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  const scoreColor = result ? HEALTH_SCORE_COLORS[result.healthScore] : COLORS.whiteAlpha40;

  return (
    <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Food</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Search Input */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={COLORS.whiteAlpha60} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter food or dish name..."
                  placeholderTextColor={COLORS.whiteAlpha40}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => analyze()}
                  returnKeyType="search"
                  autoFocus
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => { setQuery(''); setResult(null); }}>
                    <Ionicons name="close-circle" size={18} color={COLORS.whiteAlpha40} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.analyzeBtn} onPress={() => analyze()} disabled={loading || !query.trim()}>
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Ionicons name="sparkles" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Foods */}
            {!result && (
              <>
                <Text style={styles.sectionTitle}>Quick Add</Text>
                <View style={styles.quickGrid}>
                  {QUICK_FOODS.map((f) => (
                    <TouchableOpacity key={f} style={styles.quickChip} onPress={() => { setQuery(f); analyze(f); }}>
                      <Text style={styles.quickChipText}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Result */}
            {result && (
              <View style={styles.resultCard}>
                {/* Score Header */}
                <View style={[styles.scoreHeader, { borderColor: scoreColor + '40' }]}>
                  <LinearGradient colors={[scoreColor + '20', 'transparent']} style={styles.scoreHeaderGrad}>
                    <Text style={{ fontSize: 32 }}>{HEALTH_SCORE_EMOJIS[result.healthScore]}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.resultName}>{result.name}</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '25' }]}>
                        <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
                          {HEALTH_SCORE_LABELS[result.healthScore]}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Editable Macros */}
                <Text style={styles.editLabel}>Adjust macros if needed:</Text>
                <View style={styles.editGrid}>
                  <EditField label="Calories" value={editCal} onChange={setEditCal} unit="kcal" color={COLORS.crimson} />
                  <EditField label="Protein" value={editPro} onChange={setEditPro} unit="g" color={COLORS.green} />
                  <EditField label="Carbs" value={editCarb} onChange={setEditCarb} unit="g" color={COLORS.purpleLight} />
                  <EditField label="Fat" value={editFat} onChange={setEditFat} unit="g" color="#F97316" />
                </View>

                {/* Health Info */}
                {result.healthReason && (
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.purpleLight} />
                    <Text style={styles.infoText}>{result.healthReason}</Text>
                  </View>
                )}
                {result.tips && (
                  <View style={styles.tipBox}>
                    <Ionicons name="bulb-outline" size={16} color="#FFCC00" />
                    <Text style={styles.tipText}>{result.tips}</Text>
                  </View>
                )}

                <Text style={styles.servingText}>Serving: {result.servingSize}</Text>

                {/* Meal Type Selector */}
                <Text style={styles.mealTypeLabel}>Add to meal:</Text>
                <View style={styles.mealTypeRow}>
                  {MEAL_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.mealTypeBtn, mealType === t && styles.mealTypeBtnActive]}
                      onPress={() => setMealType(t)}
                    >
                      <Text style={[styles.mealTypeBtnText, mealType === t && styles.mealTypeBtnTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Log Button */}
                <TouchableOpacity style={styles.logBtn} onPress={logFood} disabled={logging} activeOpacity={0.85}>
                  <LinearGradient colors={GRADIENT_BTN as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.logBtnGrad}>
                    {logging ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                        <Text style={styles.logBtnText}>Log to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resetBtn} onPress={() => { setResult(null); setQuery(''); }}>
                  <Text style={styles.resetText}>Search another food</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function EditField({ label, value, onChange, unit, color }: { label: string; value: string; onChange: (v: string) => void; unit: string; color: string }) {
  return (
    <View style={editStyles.wrap}>
      <Text style={[editStyles.label, { color }]}>{label}</Text>
      <View style={editStyles.inputRow}>
        <TextInput
          style={editStyles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <Text style={editStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const editStyles = StyleSheet.create({
  wrap: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { color: COLORS.white, fontSize: 20, fontWeight: '800', flex: 1 },
  unit: { color: COLORS.whiteAlpha40, fontSize: 12 },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },

  scroll: { paddingHorizontal: 18 },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.inputBorder,
    paddingHorizontal: 14, height: 50,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 15 },
  analyzeBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: COLORS.crimson, alignItems: 'center', justifyContent: 'center',
  },

  sectionTitle: { color: COLORS.whiteAlpha60, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  quickChipText: { color: COLORS.whiteAlpha80, fontSize: 13 },

  resultCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.cardBorder, padding: 18,
  },

  scoreHeader: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 18 },
  scoreHeaderGrad: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  resultName: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  scoreBadgeText: { fontSize: 12, fontWeight: '700' },

  editLabel: { color: COLORS.whiteAlpha60, fontSize: 13, marginBottom: 10 },
  editGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(168,85,247,0.08)', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  infoText: { color: COLORS.whiteAlpha80, fontSize: 13, flex: 1, lineHeight: 18 },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,204,0,0.08)', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  tipText: { color: COLORS.whiteAlpha80, fontSize: 13, flex: 1, lineHeight: 18 },
  servingText: { color: COLORS.whiteAlpha40, fontSize: 12, marginBottom: 14 },

  mealTypeLabel: { color: COLORS.whiteAlpha60, fontSize: 13, marginBottom: 8 },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  mealTypeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  mealTypeBtnActive: { backgroundColor: COLORS.crimson + '25', borderColor: COLORS.crimson },
  mealTypeBtnText: { color: COLORS.whiteAlpha60, fontSize: 13, fontWeight: '500' },
  mealTypeBtnTextActive: { color: COLORS.crimson, fontWeight: '700' },

  logBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  logBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  logBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  resetBtn: { alignItems: 'center' },
  resetText: { color: COLORS.purpleLight, fontSize: 13 },
});
