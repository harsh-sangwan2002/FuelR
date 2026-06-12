import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { auth, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  COLORS,
  GRADIENT_BTN,
  GRADIENT_DASH,
} from '../constants/colors';
import {
  Gender,
  FitnessGoal,
  ActivityLevel,
  profileCompletionPct,
  calcAge,
  dobToDisplay,
  dobToIso,
} from '../types/user';

// ─── Pill selector ────────────────────────────────────────────────────────────
function PillRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pillStyles.scroll}>
      <View style={pillStyles.row}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            activeOpacity={0.75}
            style={pillStyles.pillWrap}
          >
            {value === o.key ? (
              <LinearGradient
                colors={GRADIENT_BTN}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={pillStyles.pillActive}
              >
                <Text style={pillStyles.pillTextActive}>{o.label}</Text>
              </LinearGradient>
            ) : (
              <View style={pillStyles.pillInactive}>
                <Text style={pillStyles.pillTextInactive}>{o.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const pillStyles = StyleSheet.create({
  scroll: { marginHorizontal: -20 },
  row: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 4, gap: 8 },
  pillWrap: { borderRadius: 22 },
  pillActive: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22 },
  pillInactive: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: COLORS.whiteAlpha08,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  pillTextActive: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  pillTextInactive: { color: COLORS.whiteAlpha60, fontWeight: '500', fontSize: 13 },
});

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={secStyles.row}>
      <View style={secStyles.iconBox}>
        <Ionicons name={icon} size={16} color={COLORS.purpleLight} />
      </View>
      <Text style={secStyles.title}>{title}</Text>
    </View>
  );
}

const secStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(168,85,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.white, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
});

// ─── Inline field ─────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  rightSlot,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric' | 'email-address';
  editable?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={fieldSt.wrapper}>
      <Text style={fieldSt.label}>{label}</Text>
      <View style={[fieldSt.inputRow, !editable && fieldSt.disabled]}>
        <TextInput
          style={fieldSt.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={COLORS.whiteAlpha40}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize="none"
        />
        {rightSlot}
      </View>
    </View>
  );
}

const fieldSt = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { color: COLORS.whiteAlpha60, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
  },
  disabled: { opacity: 0.55 },
  input: { flex: 1, color: COLORS.white, fontSize: 15 },
});

// ─── Unit toggle button ───────────────────────────────────────────────────────
function UnitToggle({ options, value, onChange }: { options: [string, string]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={unitSt.container}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          onPress={() => onChange(o)}
          style={[unitSt.btn, value === o && unitSt.btnActive]}
        >
          <Text style={[unitSt.text, value === o && unitSt.textActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const unitSt = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2, marginLeft: 8 },
  btn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  btnActive: { backgroundColor: COLORS.purpleDark },
  text: { color: COLORS.whiteAlpha40, fontSize: 12, fontWeight: '600' },
  textActive: { color: COLORS.white },
});

// ─── Main component ───────────────────────────────────────────────────────────
const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const GOAL_OPTIONS: { key: FitnessGoal; label: string }[] = [
  { key: 'lose_weight', label: 'Lose Weight' },
  { key: 'gain_muscle', label: 'Gain Muscle' },
  { key: 'maintain', label: 'Maintain' },
  { key: 'improve_endurance', label: 'Endurance' },
  { key: 'general_fitness', label: 'General Fitness' },
];

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'lightly_active', label: 'Lightly Active' },
  { key: 'moderately_active', label: 'Moderately Active' },
  { key: 'very_active', label: 'Very Active' },
  { key: 'extremely_active', label: 'Extremely Active' },
];

export default function ProfileScreen() {
  const { user, userProfile, updateUserProfile, logOut } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');        // display format DD/MM/YYYY
  const [gender, setGender] = useState<Gender | undefined>();
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | undefined>();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Pre-fill from Firestore profile
  useEffect(() => {
    if (!userProfile) return;
    setName(userProfile.name ?? '');
    setPhone(userProfile.phone ?? '');
    setDob(userProfile.dob ? dobToDisplay(userProfile.dob) : '');
    setGender(userProfile.gender);
    setWeight(userProfile.weight != null ? String(userProfile.weight) : '');
    setWeightUnit(userProfile.weightUnit ?? 'kg');
    setHeight(userProfile.height != null ? String(userProfile.height) : '');
    setHeightUnit(userProfile.heightUnit ?? 'cm');
    setFitnessGoal(userProfile.fitnessGoal);
    setActivityLevel(userProfile.activityLevel);
  }, [userProfile]);

  const pct = profileCompletionPct(userProfile);
  const initials = (userProfile?.name ?? user?.displayName ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const age = dob.length === 10 ? (() => {
    const iso = dobToIso(dob);
    return iso ? calcAge(iso) : null;
  })() : null;

  // Auto-format DOB as DD/MM/YYYY while typing
  const handleDobChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setDob(formatted);
  };

  const pickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission denied', 'Camera access is required.'); return; }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
          });
          if (!result.canceled && result.assets[0].base64) await uploadPhoto(result.assets[0].base64);
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission denied', 'Photo library access is required.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
          });
          if (!result.canceled && result.assets[0].base64) await uploadPhoto(result.assets[0].base64);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (base64: string) => {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await uploadString(storageRef, `data:image/jpeg;base64,${base64}`, 'data_url');
      const url = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser!, { photoURL: url });
      await updateUserProfile({ photoURL: url });
    } catch {
      Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    if (dob && dob.length !== 10) {
      Alert.alert('Validation', 'Enter a full date of birth (DD/MM/YYYY).');
      return;
    }
    const isoDate = dob ? dobToIso(dob) : undefined;
    if (dob && !isoDate) {
      Alert.alert('Validation', 'Invalid date of birth.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        dob: isoDate ?? undefined,
        gender,
        weight: weight ? parseFloat(weight) : undefined,
        weightUnit,
        height: height ? parseFloat(height) : undefined,
        heightUnit,
        fitnessGoal,
        activityLevel,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={GRADIENT_DASH} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={st.bg}>
      <SafeAreaView style={st.safe} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.kav}>
          <ScrollView
            style={st.scroll}
            contentContainerStyle={st.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Profile header ── */}
            <View style={st.headerCard}>
              <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8} style={st.avatarWrap}>
                {userProfile?.photoURL ? (
                  <Image source={{ uri: userProfile.photoURL }} style={st.avatarImg} />
                ) : (
                  <LinearGradient colors={GRADIENT_BTN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.avatar}>
                    <Text style={st.avatarText}>{initials}</Text>
                  </LinearGradient>
                )}
                <View style={st.cameraOverlay}>
                  {uploadingPhoto
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Ionicons name="camera" size={13} color={COLORS.white} />}
                </View>
              </TouchableOpacity>
              <View style={st.headerInfo}>
                <Text style={st.headerName}>{userProfile?.name || user?.displayName || 'Your Profile'}</Text>
                <Text style={st.headerEmail}>{user?.email}</Text>
                <View style={st.completionRow}>
                  <View style={st.completionTrack}>
                    <View style={[st.completionFill, { width: `${pct}%`, backgroundColor: pct === 100 ? COLORS.green : COLORS.purpleLight }]} />
                  </View>
                  <Text style={[st.completionPct, { color: pct === 100 ? COLORS.green : COLORS.purpleLight }]}>
                    {pct}%{pct < 100 ? ' complete' : ' ✓'}
                  </Text>
                </View>
                {pct < 100 && (
                  <Text style={st.completeHint}>Complete your profile to get personalized goals</Text>
                )}
              </View>
            </View>

            {/* ── Personal Info ── */}
            <View style={st.section}>
              <SectionHeader icon="person-outline" title="Personal Info" />
              <Field label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" keyboardType="default" />
              <Field label="Email" value={user?.email ?? ''} editable={false} placeholder="email@example.com" keyboardType="email-address" />
              <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
              <Field
                label={`Date of Birth${age !== null ? `  (Age: ${age})` : ''}`}
                value={dob}
                onChangeText={handleDobChange}
                placeholder="DD/MM/YYYY"
                keyboardType="numeric"
              />
              <View style={fieldSt.wrapper}>
                <Text style={fieldSt.label}>Gender</Text>
                <PillRow options={GENDER_OPTIONS} value={gender} onChange={setGender} />
              </View>
            </View>

            {/* ── Body Metrics ── */}
            <View style={st.section}>
              <SectionHeader icon="barbell-outline" title="Body Metrics" />
              <Field
                label="Weight"
                value={weight}
                onChangeText={setWeight}
                placeholder={`e.g. 70`}
                keyboardType="numeric"
                rightSlot={
                  <UnitToggle
                    options={['kg', 'lbs']}
                    value={weightUnit}
                    onChange={(v) => setWeightUnit(v as 'kg' | 'lbs')}
                  />
                }
              />
              <Field
                label="Height"
                value={height}
                onChangeText={setHeight}
                placeholder={`e.g. 175`}
                keyboardType="numeric"
                rightSlot={
                  <UnitToggle
                    options={['cm', 'ft']}
                    value={heightUnit}
                    onChange={(v) => setHeightUnit(v as 'cm' | 'ft')}
                  />
                }
              />
            </View>

            {/* ── Fitness Profile ── */}
            <View style={st.section}>
              <SectionHeader icon="trophy-outline" title="Fitness Profile" />
              <View style={fieldSt.wrapper}>
                <Text style={fieldSt.label}>Primary Goal</Text>
                <PillRow options={GOAL_OPTIONS} value={fitnessGoal} onChange={setFitnessGoal} />
              </View>
              <View style={fieldSt.wrapper}>
                <Text style={fieldSt.label}>Activity Level</Text>
                <PillRow options={ACTIVITY_OPTIONS} value={activityLevel} onChange={setActivityLevel} />
              </View>
            </View>

            {/* ── Save ── */}
            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={st.saveWrap}>
              <LinearGradient colors={GRADIENT_BTN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.saveBtn}>
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                    <Text style={st.saveBtnText}>Save Profile</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Sign Out ── */}
            <TouchableOpacity onPress={logOut} style={st.signOutBtn} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={16} color={COLORS.whiteAlpha60} />
              <Text style={st.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },

  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgDark,
  },

  // Header card
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: 22 },
  headerInfo: { flex: 1 },
  headerName: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  headerEmail: { color: COLORS.whiteAlpha60, fontSize: 13, marginBottom: 10 },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completionTrack: {
    flex: 1,
    height: 5,
    backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionFill: { height: '100%', borderRadius: 3 },
  completionPct: { fontSize: 12, fontWeight: '700' },
  completeHint: { color: COLORS.whiteAlpha40, fontSize: 11, marginTop: 6 },

  // Section
  section: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
  },

  // Save button
  saveWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
    shadowColor: COLORS.crimson,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  saveBtn: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
  },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    opacity: 0.65,
  },
  signOutText: { color: COLORS.whiteAlpha60, fontSize: 13 },
});
