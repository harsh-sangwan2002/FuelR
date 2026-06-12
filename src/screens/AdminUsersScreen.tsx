import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import { UserProfile, Role } from '../types/user';

const ADMIN_GRAD: [string, string, string] = ['#0A000F', '#0D1B2A', '#1A0A2E'];

type FilterTab = 'all' | 'user' | 'admin';

function UserCard({
  profile,
  isSelf,
  onRoleChange,
  updating,
}: {
  profile: UserProfile;
  isSelf: boolean;
  onRoleChange: (uid: string, newRole: Role) => void;
  updating: boolean;
}) {
  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const joinedDate = profile.createdAt?.toDate
    ? profile.createdAt.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const isAdmin = profile.role === 'admin';
  const nextRole: Role = isAdmin ? 'user' : 'admin';

  return (
    <View style={cardSt.card}>
      <View style={cardSt.topRow}>
        <LinearGradient
          colors={isAdmin ? ['#7B2FBE', '#3B0764'] : ['#22C55E', '#1A7A4A']}
          style={cardSt.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={cardSt.avatarText}>{initials}</Text>
        </LinearGradient>

        <View style={cardSt.info}>
          <View style={cardSt.nameRow}>
            <Text style={cardSt.name}>{profile.name}</Text>
            {isSelf && (
              <View style={cardSt.youBadge}>
                <Text style={cardSt.youText}>you</Text>
              </View>
            )}
          </View>
          <Text style={cardSt.email} numberOfLines={1}>{profile.email}</Text>
          {profile.phone ? <Text style={cardSt.meta}>{profile.phone}</Text> : null}
          <Text style={cardSt.meta}>Joined {joinedDate}</Text>
        </View>

        <View style={[cardSt.roleBadge, isAdmin ? cardSt.roleAdmin : cardSt.roleUser]}>
          <Ionicons
            name={isAdmin ? 'shield' : 'person'}
            size={12}
            color={isAdmin ? COLORS.purpleLight : COLORS.green}
            style={{ marginRight: 4 }}
          />
          <Text style={[cardSt.roleText, isAdmin ? cardSt.roleTextAdmin : cardSt.roleTextUser]}>
            {profile.role}
          </Text>
        </View>
      </View>

      <View style={cardSt.divider} />

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Change Role',
            `${isSelf ? 'You are changing your own role. ' : ''}Set ${profile.name} as "${nextRole}"?${
              isSelf && nextRole === 'user' ? '\n\nYou will be redirected to the user dashboard.' : ''
            }`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: `Set as ${nextRole}`,
                style: nextRole === 'admin' ? 'default' : 'destructive',
                onPress: () => onRoleChange(profile.uid, nextRole),
              },
            ]
          );
        }}
        disabled={updating}
        activeOpacity={0.75}
        style={[cardSt.roleBtn, isAdmin ? cardSt.roleBtnDemote : cardSt.roleBtnPromote]}
      >
        {updating ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons
              name={isAdmin ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
              size={15}
              color={COLORS.white}
            />
            <Text style={cardSt.roleBtnText}>
              {isAdmin ? 'Demote to User' : 'Promote to Admin'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const cardSt = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  name: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  youBadge: {
    backgroundColor: 'rgba(220,20,60,0.2)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  youText: { color: COLORS.crimsonLight, fontSize: 10, fontWeight: '700' },
  email: { color: COLORS.whiteAlpha60, fontSize: 12, marginBottom: 2 },
  meta: { color: COLORS.whiteAlpha40, fontSize: 11 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleAdmin: { backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  roleUser: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)' },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  roleTextAdmin: { color: COLORS.purpleLight },
  roleTextUser: { color: COLORS.green },
  divider: { height: 1, backgroundColor: COLORS.whiteAlpha08, marginVertical: 12 },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  roleBtnPromote: { backgroundColor: 'rgba(168,85,247,0.25)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  roleBtnDemote: { backgroundColor: 'rgba(220,20,60,0.18)', borderWidth: 1, borderColor: 'rgba(220,20,60,0.35)' },
  roleBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => d.data() as UserProfile));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleRoleChange = useCallback(async (uid: string, newRole: Role) => {
    setUpdatingUid(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole, updatedAt: serverTimestamp() });
    } catch {
      Alert.alert('Error', 'Could not update role. Check your Firestore rules.');
    } finally {
      setUpdatingUid(null);
    }
  }, []);

  const filtered = users.filter((u) => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${users.length})` },
    { key: 'user', label: `Users (${users.filter((u) => u.role === 'user').length})` },
    { key: 'admin', label: `Admins (${users.filter((u) => u.role === 'admin').length})` },
  ];

  return (
    <LinearGradient colors={ADMIN_GRAD} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={st.bg}>
      <SafeAreaView style={st.safe} edges={['top']}>
        {/* ── Header ── */}
        <View style={st.header}>
          <Text style={st.title}>User Management</Text>
          <Text style={st.subtitle}>{users.length} registered {users.length === 1 ? 'user' : 'users'}</Text>
        </View>

        {/* ── Search ── */}
        <View style={st.searchRow}>
          <Ionicons name="search-outline" size={18} color={COLORS.whiteAlpha40} style={st.searchIcon} />
          <TextInput
            style={st.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or email..."
            placeholderTextColor={COLORS.whiteAlpha40}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.whiteAlpha40} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter tabs ── */}
        <View style={st.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[st.filterTab, filter === tab.key && st.filterTabActive]}
              activeOpacity={0.75}
            >
              <Text style={[st.filterText, filter === tab.key && st.filterTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── List ── */}
        {loading ? (
          <View style={st.center}>
            <ActivityIndicator size="large" color={COLORS.purpleLight} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <UserCard
                profile={item}
                isSelf={item.uid === user?.uid}
                onRoleChange={handleRoleChange}
                updating={updatingUid === item.uid}
              />
            )}
            contentContainerStyle={st.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={st.emptyText}>No users match your search.</Text>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { color: COLORS.whiteAlpha60, fontSize: 13, marginTop: 2 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 15 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.whiteAlpha08,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  filterTabActive: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderColor: 'rgba(168,85,247,0.5)',
  },
  filterText: { color: COLORS.whiteAlpha60, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: COLORS.purpleLight },

  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.whiteAlpha40, fontSize: 14, textAlign: 'center', marginTop: 40 },
});
