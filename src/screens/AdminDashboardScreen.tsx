import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import { UserProfile } from '../types/user';

const ADMIN_GRAD: [string, string, string] = ['#0A000F', '#0D1B2A', '#1A0A2E'];
const STAT_COLORS: [string, string][] = [
  ['#7B2FBE', '#3B0764'],
  ['#DC143C', '#9B0A26'],
  ['#22C55E', '#1A7A4A'],
];

interface Stats {
  total: number;
  admins: number;
  newThisWeek: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
  loading: boolean;
}

function StatCard({ label, value, icon, colors, loading }: StatCardProps) {
  return (
    <View style={statSt.card}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={statSt.iconBadge}>
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </LinearGradient>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.purpleLight} style={{ marginTop: 10 }} />
      ) : (
        <Text style={statSt.value}>{value}</Text>
      )}
      <Text style={statSt.label}>{label}</Text>
    </View>
  );
}

const statSt = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: { color: COLORS.white, fontSize: 22, fontWeight: '800', marginBottom: 3 },
  label: { color: COLORS.whiteAlpha60, fontSize: 10, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3, textTransform: 'uppercase' },
});

function RecentUserRow({ profile }: { profile: UserProfile }) {
  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const joinedDate = profile.createdAt?.toDate
    ? profile.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  return (
    <View style={rowSt.row}>
      <LinearGradient
        colors={profile.role === 'admin' ? ['#7B2FBE', '#3B0764'] : ['#22C55E', '#1A7A4A']}
        style={rowSt.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={rowSt.avatarText}>{initials}</Text>
      </LinearGradient>
      <View style={rowSt.info}>
        <Text style={rowSt.name}>{profile.name}</Text>
        <Text style={rowSt.email} numberOfLines={1}>{profile.email}</Text>
      </View>
      <View style={rowSt.right}>
        <View style={[rowSt.badge, profile.role === 'admin' ? rowSt.badgeAdmin : rowSt.badgeUser]}>
          <Text style={[rowSt.badgeText, profile.role === 'admin' ? rowSt.badgeTextAdmin : rowSt.badgeTextUser]}>
            {profile.role}
          </Text>
        </View>
        <Text style={rowSt.date}>{joinedDate}</Text>
      </View>
    </View>
  );
}

const rowSt = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.whiteAlpha08,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  info: { flex: 1 },
  name: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  email: { color: COLORS.whiteAlpha60, fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeAdmin: { backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  badgeUser: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)' },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  badgeTextAdmin: { color: COLORS.purpleLight },
  badgeTextUser: { color: COLORS.green },
  date: { color: COLORS.whiteAlpha40, fontSize: 11 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const { user, userProfile, logOut } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats] = useState<Stats>({ total: 0, admins: 0, newThisWeek: 0 });
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const initials = (userProfile?.name ?? user?.displayName ?? 'A')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  useEffect(() => {
    fetchStats();
    fetchRecentUsers();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const allSnap = await getDocs(collection(db, 'users'));
      const adminSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekSnap = await getDocs(
        query(collection(db, 'users'), where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)))
      );
      setStats({
        total: allSnap.size,
        admins: adminSnap.size,
        newThisWeek: weekSnap.size,
      });
    } catch {
      // silently fail — Firestore rules may not allow this yet
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentUsers = async () => {
    setLoadingRecent(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
      const snap = await getDocs(q);
      setRecentUsers(snap.docs.map((d) => d.data() as UserProfile));
    } catch {
      // silently fail
    } finally {
      setLoadingRecent(false);
    }
  };

  return (
    <LinearGradient colors={ADMIN_GRAD} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={st.bg}>
      <SafeAreaView style={st.safe} edges={['top']}>
        <ScrollView
          style={st.scroll}
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top bar ── */}
          <View style={st.topBar}>
            <View style={st.topLeft}>
              <View style={st.shieldBadge}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.purpleLight} />
              </View>
              <View>
                <Text style={st.title}>Admin Panel</Text>
                <Text style={st.subtitle}>Welcome back, {(userProfile?.name ?? user?.displayName ?? 'Admin').split(' ')[0]}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} activeOpacity={0.8}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={st.avatarImg} />
              ) : (
                <LinearGradient colors={['#7B2FBE', '#3B0764']} style={st.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={st.avatarText}>{initials}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Stats ── */}
          <Text style={st.sectionTitle}>Overview</Text>
          <View style={st.statsRow}>
            <StatCard label="Total Users" value={stats.total} icon="people" colors={STAT_COLORS[0]} loading={loadingStats} />
            <StatCard label="Admins" value={stats.admins} icon="shield" colors={STAT_COLORS[1]} loading={loadingStats} />
            <StatCard label="This Week" value={stats.newThisWeek} icon="person-add" colors={STAT_COLORS[2]} loading={loadingStats} />
          </View>

          {/* ── Recent sign-ups ── */}
          <View style={st.section}>
            <View style={st.sectionRow}>
              <Text style={st.sectionTitle}>Recent Sign-ups</Text>
              <TouchableOpacity onPress={fetchRecentUsers}>
                <Ionicons name="refresh" size={16} color={COLORS.whiteAlpha60} />
              </TouchableOpacity>
            </View>
            {loadingRecent ? (
              <ActivityIndicator color={COLORS.purpleLight} style={{ marginVertical: 20 }} />
            ) : recentUsers.length === 0 ? (
              <Text style={st.emptyText}>No users yet.</Text>
            ) : (
              recentUsers.map((u) => <RecentUserRow key={u.uid} profile={u} />)
            )}
          </View>

          {/* ── Quick info ── */}
          <View style={st.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.purpleLight} style={{ marginRight: 10 }} />
            <Text style={st.infoText}>
              To manage user roles, go to the <Text style={{ color: COLORS.white, fontWeight: '700' }}>Users</Text> tab. Role changes take effect on the user's next login.
            </Text>
          </View>

          {/* ── Sign Out ── */}
          <TouchableOpacity onPress={logOut} style={st.signOutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={16} color={COLORS.whiteAlpha60} />
            <Text style={st.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shieldBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.white, fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { color: COLORS.whiteAlpha60, fontSize: 13, marginTop: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 13,
  },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24, alignItems: 'flex-start' },

  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: 0.3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  section: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },

  emptyText: { color: COLORS.whiteAlpha40, fontSize: 14, textAlign: 'center', paddingVertical: 16 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  infoText: { flex: 1, color: COLORS.whiteAlpha60, fontSize: 13, lineHeight: 20 },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    opacity: 0.65,
  },
  signOutText: { color: COLORS.whiteAlpha60, fontSize: 13 },
});
