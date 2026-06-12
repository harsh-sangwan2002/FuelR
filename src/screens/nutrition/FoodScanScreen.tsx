import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, GRADIENT_BTN } from '../../constants/colors';
import {
  FoodAnalysisResult,
  MealType,
  HEALTH_SCORE_LABELS,
  HEALTH_SCORE_COLORS,
  HEALTH_SCORE_EMOJIS,
} from '../../types/nutrition';
import { analyzeFoodImage } from '../../services/nutritionAI';
import { addFoodToMeal } from '../../services/mealStorage';
import { useAuth } from '../../context/AuthContext';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodScanScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>(route.params?.mealType ?? 'lunch');
  const targetDate: string | undefined = route.params?.targetDate;
  const [logging, setLogging] = useState(false);

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Allow access to your photos.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7, base64: true });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 ?? null);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Allow camera access.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 ?? null);
      setResult(null);
    }
  };

  const analyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    try {
      const r = await analyzeFoodImage(imageBase64);
      setResult(r);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e.message ?? 'Could not analyze the image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const logFood = async () => {
    if (!result || !user) return;
    setLogging(true);
    try {
      await addFoodToMeal(user.uid, mealType, {
        id: Date.now().toString(),
        name: result.name,
        macros: result.macros,
        healthScore: result.healthScore,
        healthReason: result.healthReason,
        tips: result.tips,
        servingSize: result.servingSize,
        imageUri: imageUri ?? undefined,
        addedAt: Date.now(),
      }, targetDate);
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Error', 'Could not save the meal. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  const scoreColor = result ? HEALTH_SCORE_COLORS[result.healthScore] : COLORS.whiteAlpha40;

  return (
    <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Food</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Image Area */}
          <View style={styles.imageArea}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.foodImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={48} color={COLORS.whiteAlpha40} />
                <Text style={styles.placeholderText}>Take a photo or choose from gallery</Text>
              </View>
            )}
          </View>

          {/* Photo Actions */}
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={22} color={COLORS.white} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={22} color={COLORS.white} />
              <Text style={styles.photoBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Analyze Button */}
          {imageUri && !result && (
            <TouchableOpacity
              style={styles.analyzeBtn}
              onPress={analyze}
              disabled={analyzing}
              activeOpacity={0.85}
            >
              <LinearGradient colors={GRADIENT_BTN as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.analyzeBtnGrad}>
                {analyzing ? (
                  <>
                    <ActivityIndicator color={COLORS.white} size="small" />
                    <Text style={styles.analyzeBtnText}>Analyzing with AI...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles-outline" size={20} color={COLORS.white} />
                    <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Result Card */}
          {result && (
            <View style={styles.resultCard}>
              {/* Health Score */}
              <View style={[styles.scoreRow, { borderColor: scoreColor + '40' }]}>
                <LinearGradient
                  colors={[scoreColor + '20', scoreColor + '05']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.scoreGrad}
                >
                  <Text style={{ fontSize: 28 }}>{HEALTH_SCORE_EMOJIS[result.healthScore]}</Text>
                  <View style={{ marginLeft: 14 }}>
                    <Text style={styles.scoreName}>{result.name}</Text>
                    <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '25' }]}>
                      <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
                        {HEALTH_SCORE_LABELS[result.healthScore]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scoreNum}>
                    <Text style={[styles.scoreNumText, { color: scoreColor }]}>{result.healthScore}</Text>
                    <Text style={styles.scoreNumOf}>/5</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Macros Grid */}
              <View style={styles.macroGrid}>
                <MacroChip label="Calories" value={result.macros.calories} unit="kcal" color={COLORS.crimson} />
                <MacroChip label="Protein" value={result.macros.protein} unit="g" color={COLORS.green} />
                <MacroChip label="Carbs" value={result.macros.carbs} unit="g" color={COLORS.purpleLight} />
                <MacroChip label="Fat" value={result.macros.fat} unit="g" color="#F97316" />
                {(result.macros.fiber ?? 0) > 0 && <MacroChip label="Fiber" value={result.macros.fiber!} unit="g" color="#22C55E" />}
                {(result.macros.sugar ?? 0) > 0 && <MacroChip label="Sugar" value={result.macros.sugar!} unit="g" color="#FFCC00" />}
              </View>

              {/* Health Reason */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.purpleLight} />
                <Text style={styles.infoText}>{result.healthReason}</Text>
              </View>

              {/* Tips */}
              {result.tips && (
                <View style={styles.tipBox}>
                  <Ionicons name="bulb-outline" size={16} color="#FFCC00" />
                  <Text style={styles.tipText}>{result.tips}</Text>
                </View>
              )}

              {/* Serving size */}
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
              <TouchableOpacity
                style={styles.logBtn}
                onPress={logFood}
                disabled={logging}
                activeOpacity={0.85}
              >
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

              {/* Re-analyze */}
              <TouchableOpacity style={styles.rescanBtn} onPress={() => setResult(null)}>
                <Text style={styles.rescanText}>Scan a different food</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={[chipStyles.wrap, { borderColor: color + '30' }]}>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
      <Text style={chipStyles.unit}>{unit}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    marginBottom: 8,
  },
  value: { fontSize: 20, fontWeight: '800' },
  unit: { color: COLORS.whiteAlpha60, fontSize: 11, marginTop: 1 },
  label: { color: COLORS.whiteAlpha40, fontSize: 11, marginTop: 2 },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },

  scroll: { paddingHorizontal: 18 },

  imageArea: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  foodImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholderText: { color: COLORS.whiteAlpha40, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingVertical: 14,
  },
  photoBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },

  analyzeBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  analyzeBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  analyzeBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  resultCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 18,
    marginBottom: 16,
  },

  scoreRow: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  scoreGrad: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  scoreName: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  scoreBadgeText: { fontSize: 12, fontWeight: '700' },
  scoreNum: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'flex-end' },
  scoreNumText: { fontSize: 36, fontWeight: '900' },
  scoreNumOf: { color: COLORS.whiteAlpha40, fontSize: 16, marginBottom: 4 },

  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },

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

  servingText: { color: COLORS.whiteAlpha40, fontSize: 12, marginBottom: 16 },

  mealTypeLabel: { color: COLORS.whiteAlpha60, fontSize: 13, marginBottom: 8 },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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

  rescanBtn: { alignItems: 'center' },
  rescanText: { color: COLORS.purpleLight, fontSize: 13 },
});
