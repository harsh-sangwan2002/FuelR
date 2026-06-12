import React, { useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { COLORS, GRADIENT_BTN } from '../../constants/colors';
import { NutritionGoals, DEFAULT_GOALS } from '../../types/nutrition';
import { getNutritionGoals, saveNutritionGoals } from '../../services/mealStorage';
import { useAuth } from '../../context/AuthContext';

const PRESETS = [
  { label: 'Weight Loss', calories: 1500, protein: 140, carbs: 150, fat: 50, water: 10 },
  { label: 'Maintenance', calories: 2000, protein: 120, carbs: 250, fat: 65, water: 8 },
  { label: 'Muscle Gain', calories: 2800, protein: 200, carbs: 320, fat: 80, water: 12 },
  { label: 'Keto', calories: 1800, protein: 150, carbs: 30, fat: 130, water: 10 },
];

export default function NutritionGoalsScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('250');
  const [fat, setFat] = useState('65');
  const [water, setWater] = useState('8');

  useEffect(() => {
    if (!user) return;
    getNutritionGoals(user.uid).then((g) => {
      setCalories(String(g.dailyCalories));
      setProtein(String(g.dailyProtein));
      setCarbs(String(g.dailyCarbs));
      setFat(String(g.dailyFat));
      setWater(String(g.dailyWater));
      setLoading(false);
    });
  }, [user]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setCalories(String(preset.calories));
    setProtein(String(preset.protein));
    setCarbs(String(preset.carbs));
    setFat(String(preset.fat));
    setWater(String(preset.water));
  };

  const save = async () => {
    if (!user) return;
    const goals: NutritionGoals = {
      dailyCalories: parseInt(calories, 10) || DEFAULT_GOALS.dailyCalories,
      dailyProtein: parseInt(protein, 10) || DEFAULT_GOALS.dailyProtein,
      dailyCarbs: parseInt(carbs, 10) || DEFAULT_GOALS.dailyCarbs,
      dailyFat: parseInt(fat, 10) || DEFAULT_GOALS.dailyFat,
      dailyWater: parseInt(water, 10) || DEFAULT_GOALS.dailyWater,
    };
    setSaving(true);
    try {
      await saveNutritionGoals(user.uid, goals);
      Alert.alert('Saved!', 'Your nutrition goals have been updated.');
      nav.goBack();
    } catch {
      Alert.alert('Error', 'Could not save goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nutrition Goals</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Presets */}
            <Text style={styles.sectionTitle}>Quick Presets</Text>
            <View style={styles.presetGrid}>
              {PRESETS.map((p) => (
                <TouchableOpacity key={p.label} style={styles.presetBtn} onPress={() => applyPreset(p)} activeOpacity={0.75}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.presetGrad}>
                    <Text style={styles.presetLabel}>{p.label}</Text>
                    <Text style={styles.presetCal}>{p.calories} kcal</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* Goal Fields */}
            <Text style={styles.sectionTitle}>Custom Goals</Text>
            <View style={styles.card}>
              <GoalField icon="flame-outline" iconColor={COLORS.crimson} label="Daily Calories" value={calories} onChange={setCalories} unit="kcal" hint="1200–4000 for most people" />
              <View style={styles.fieldDivider} />
              <GoalField icon="fish-outline" iconColor={COLORS.green} label="Protein" value={protein} onChange={setProtein} unit="g/day" hint="0.7–1g per lb of body weight" />
              <View style={styles.fieldDivider} />
              <GoalField icon="leaf-outline" iconColor={COLORS.purpleLight} label="Carbohydrates" value={carbs} onChange={setCarbs} unit="g/day" hint="45–65% of total calories" />
              <View style={styles.fieldDivider} />
              <GoalField icon="water-outline" iconColor="#F97316" label="Fat" value={fat} onChange={setFat} unit="g/day" hint="20–35% of total calories" />
              <View style={styles.fieldDivider} />
              <GoalField icon="water-outline" iconColor="#3B82F6" label="Water Intake" value={water} onChange={setWater} unit="glasses" hint="8 glasses (2L) recommended daily" />
            </View>

            {/* Macro Split Preview */}
            <Text style={styles.sectionTitle}>Macro Split Preview</Text>
            <View style={styles.splitCard}>
              {(() => {
                const totalCal = parseInt(calories, 10) || 2000;
                const proKcal = (parseInt(protein, 10) || 0) * 4;
                const carbKcal = (parseInt(carbs, 10) || 0) * 4;
                const fatKcal = (parseInt(fat, 10) || 0) * 9;
                const total = proKcal + carbKcal + fatKcal || 1;
                return (
                  <>
                    <SplitBar label="Protein" kcal={proKcal} pct={proKcal / total} color={COLORS.green} />
                    <SplitBar label="Carbs" kcal={carbKcal} pct={carbKcal / total} color={COLORS.purpleLight} />
                    <SplitBar label="Fat" kcal={fatKcal} pct={fatKcal / total} color="#F97316" />
                  </>
                );
              })()}
            </View>

            {/* Save */}
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENT_BTN as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
                {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                    <Text style={styles.saveBtnText}>Save Goals</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function GoalField({ icon, iconColor, label, value, onChange, unit, hint }: {
  icon: any; iconColor: string; label: string; value: string;
  onChange: (v: string) => void; unit: string; hint: string;
}) {
  return (
    <View style={gfStyles.wrap}>
      <View style={gfStyles.labelRow}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <View style={{ marginLeft: 10 }}>
          <Text style={gfStyles.label}>{label}</Text>
          <Text style={gfStyles.hint}>{hint}</Text>
        </View>
      </View>
      <View style={gfStyles.inputWrap}>
        <TextInput
          style={gfStyles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <Text style={gfStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const gfStyles = StyleSheet.create({
  wrap: { paddingVertical: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  hint: { color: COLORS.whiteAlpha40, fontSize: 11, marginTop: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.inputBorder,
    paddingHorizontal: 16, height: 48,
  },
  input: { flex: 1, color: COLORS.white, fontSize: 18, fontWeight: '700' },
  unit: { color: COLORS.whiteAlpha60, fontSize: 13 },
});

function SplitBar({ label, kcal, pct, color }: { label: string; kcal: number; pct: number; color: string }) {
  return (
    <View style={sbStyles.wrap}>
      <View style={sbStyles.row}>
        <Text style={sbStyles.label}>{label}</Text>
        <Text style={sbStyles.val}>{Math.round(pct * 100)}% ({kcal} kcal)</Text>
      </View>
      <View style={sbStyles.track}>
        <View style={[sbStyles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: COLORS.whiteAlpha60, fontSize: 13 },
  val: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 18 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  presetBtn: { width: '48%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.cardBorder },
  presetGrad: { padding: 16 },
  presetLabel: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  presetCal: { color: COLORS.whiteAlpha60, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 18, marginBottom: 24 },
  fieldDivider: { height: 1, backgroundColor: COLORS.whiteAlpha08 },
  splitCard: { backgroundColor: COLORS.cardBg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 18, marginBottom: 24 },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
