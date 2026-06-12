import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, GRADIENT_BTN } from '../../constants/colors';
import { ChatSession } from '../../types/nutrition';
import { getChatSessions, deleteChatSession } from '../../services/mealStorage';
import { useAuth } from '../../context/AuthContext';

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatHistoryScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getChatSessions(user.uid);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (session: ChatSession) => {
    Alert.alert(
      'Delete Chat',
      `Delete "${session.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChatSession(user!.uid, session.id);
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          },
        },
      ],
    );
  };

  const handleOpen = (session: ChatSession) => {
    nav.navigate('NutritionChat', { sessionId: session.id });
  };

  const renderItem = ({ item }: { item: ChatSession }) => {
    const lastMsg = item.messages[item.messages.length - 1];
    const msgCount = item.messages.filter((m) => m.id !== 'intro').length;

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => handleOpen(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.75}
      >
        <View style={styles.sessionLeft}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={GRADIENT_BTN as any} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 16 }}>🤖</Text>
          </View>
        </View>

        <View style={styles.sessionBody}>
          <View style={styles.sessionTopRow}>
            <Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.sessionDate}>{formatDate(item.updatedAt)}</Text>
          </View>
          {lastMsg && (
            <Text style={styles.sessionPreview} numberOfLines={2}>
              {lastMsg.content}
            </Text>
          )}
          <View style={styles.sessionMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="chatbubble-outline" size={11} color={COLORS.whiteAlpha40} />
              <Text style={styles.metaText}>{msgCount} messages</Text>
            </View>
            <Text style={styles.sessionTime}>{formatTime(item.updatedAt)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.whiteAlpha40} style={{ alignSelf: 'center', marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat History</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => nav.navigate('NutritionChat', {})}
          >
            <LinearGradient colors={GRADIENT_BTN as any} style={StyleSheet.absoluteFill} />
            <Ionicons name="add" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.crimson} size="large" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <LinearGradient colors={GRADIENT_BTN as any} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 32 }}>🤖</Text>
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a chat with your AI nutrition coach to get personalized guidance.
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => nav.navigate('NutritionChat', {})}
              activeOpacity={0.85}
            >
              <LinearGradient colors={GRADIENT_BTN as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startBtnGrad}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.white} />
                <Text style={styles.startBtnText}>Start a conversation</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>Long-press a chat to delete it</Text>
            <FlatList
              data={sessions}
              keyExtractor={(s) => s.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  newBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hint: {
    color: COLORS.whiteAlpha40,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },

  list: { paddingHorizontal: 18, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: COLORS.whiteAlpha08, marginHorizontal: 4 },

  sessionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 12,
  },
  sessionLeft: {},
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  sessionBody: { flex: 1 },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  sessionDate: { color: COLORS.whiteAlpha40, fontSize: 12 },
  sessionPreview: {
    color: COLORS.whiteAlpha60,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.whiteAlpha40, fontSize: 11 },
  sessionTime: { color: COLORS.whiteAlpha40, fontSize: 11 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.whiteAlpha60,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  startBtn: { borderRadius: 14, overflow: 'hidden' },
  startBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  startBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
