import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENT_DASH } from '../constants/colors';

interface PlaceholderScreenProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
}

export default function PlaceholderScreen({ title, icon, subtitle }: PlaceholderScreenProps) {
  return (
    <LinearGradient colors={GRADIENT_DASH} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <View style={styles.iconRing}>
            <Ionicons name={icon} size={48} color={COLORS.purple} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle ?? 'Coming soon — stay tuned!'}</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: COLORS.whiteAlpha60,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
