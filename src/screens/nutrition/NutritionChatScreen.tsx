import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, GRADIENT_BTN } from '../../constants/colors';
import { ChatMessage, NutritionGoals, DEFAULT_GOALS, ChatSession } from '../../types/nutrition';
import { agentChatWithNutritionAI } from '../../services/nutritionAI';
import { getNutritionGoals, saveChatSession, getChatSession } from '../../services/mealStorage';
import { useAuth } from '../../context/AuthContext';

const SUGGESTED_PROMPTS = [
  'How am I doing today?',
  'Log chicken breast to lunch',
  'How much protein do I still need?',
  'Suggest a high-protein dinner',
  'Show my week overview',
  'Log 3 glasses of water',
];

const INTRO_ID = 'intro';

function makeIntroMessage(): ChatMessage {
  return {
    id: INTRO_ID,
    role: 'assistant',
    content: "Hi! I'm your AI nutrition coach with real-time access to your data. I can check your intake, log food directly, update your water, and answer any nutrition questions. What can I help you with?",
    timestamp: Date.now(),
  };
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function shortDateLabel(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return '';
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NutritionChatScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const targetDate: string = route.params?.targetDate ?? todayStr();
  const isToday = targetDate === todayStr();
  const dateBadgeLabel = shortDateLabel(targetDate);

  const [messages, setMessages] = useState<ChatMessage[]>([makeIntroMessage()]);
  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId ?? null);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userGoals = await getNutritionGoals(user.uid);
      setGoals(userGoals);

      if (route.params?.sessionId) {
        const session = await getChatSession(user.uid, route.params.sessionId);
        if (session) {
          setMessages(session.messages);
          setSessionTitle(session.title);
          setSessionId(session.id);
        }
      }
      setInitializing(false);
    };
    init();
  }, [user]);

  const scrollToBottom = () => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const persistSession = useCallback(
    async (msgs: ChatMessage[], title: string, id: string) => {
      if (!user) return;
      await saveChatSession(user.uid, {
        id,
        title,
        messages: msgs,
        createdAt: msgs[0]?.timestamp ?? Date.now(),
        updatedAt: Date.now(),
      });
    },
    [user],
  );

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading || initializing) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setLoading(true);
      Keyboard.dismiss();
      scrollToBottom();

      // Derive session title from the first user message
      const userMessages = newMessages.filter((m) => m.role === 'user');
      const newTitle =
        userMessages.length === 1
          ? content.length > 48
            ? content.substring(0, 48) + '…'
            : content
          : sessionTitle;

      const id = sessionId ?? Date.now().toString();
      if (!sessionId) {
        setSessionId(id);
        setSessionTitle(newTitle);
      }

      try {
        const { reply, actionsPerformed } = await agentChatWithNutritionAI(
          newMessages,
          user!.uid,
          goals,
          targetDate,
        );

        const aiMsg: ChatMessage = {
          id: Date.now().toString() + '_ai',
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
          toolActions: actionsPerformed.length > 0 ? actionsPerformed : undefined,
        };

        const finalMessages = [...newMessages, aiMsg];
        setMessages(finalMessages);
        await persistSession(finalMessages, newTitle, id);
        scrollToBottom();
      } catch {
        const errMsg: ChatMessage = {
          id: Date.now().toString() + '_err',
          role: 'assistant',
          content: 'Sorry, I had trouble connecting. Please check your internet connection and try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, initializing, messages, goals, sessionId, sessionTitle, user, persistSession],
  );

  const startNewChat = () => {
    setMessages([makeIntroMessage()]);
    setSessionId(null);
    setSessionTitle('New Chat');
    setInput('');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <LinearGradient colors={GRADIENT_BTN as any} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </View>
        )}
        <View style={{ maxWidth: '78%' }}>
          {!isUser && item.toolActions && item.toolActions.length > 0 && (
            <View style={styles.toolActionsWrap}>
              {item.toolActions.map((action, i) => (
                <View key={i} style={styles.toolChip}>
                  <Ionicons name="flash" size={10} color={COLORS.purpleLight} />
                  <Text style={styles.toolChipText}>{action}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
            <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
              {item.content}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const showSuggestions = messages.length <= 1 && !loading && !initializing;

  return (
    <LinearGradient colors={['#0A000F', '#14082A', '#091409']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerCenter} onPress={startNewChat} activeOpacity={0.7}>
              <View style={styles.aiIndicator}>
                <View style={styles.aiDot} />
                <Text style={styles.aiStatus} numberOfLines={1}>
                  {sessionTitle === 'New Chat' ? 'AI Nutrition Coach' : sessionTitle}
                </Text>
                {!isToday && dateBadgeLabel !== '' && (
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>{dateBadgeLabel}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.aiModel}>Powered by Claude · Agent mode{!isToday ? ` · ${dateBadgeLabel || targetDate}` : ''}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => nav.navigate('ChatHistory')}
            >
              <Ionicons name="time-outline" size={22} color={COLORS.whiteAlpha80} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListFooterComponent={
              loading ? (
                <View style={styles.typingRow}>
                  <View style={styles.aiAvatar}>
                    <LinearGradient colors={GRADIENT_BTN as any} style={StyleSheet.absoluteFill} />
                    <Text style={{ fontSize: 14 }}>🤖</Text>
                  </View>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator color={COLORS.purpleLight} size="small" />
                    <Text style={styles.typingText}>Agent thinking…</Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Suggested prompts */}
          {showSuggestions && (
            <View style={styles.suggestContainer}>
              <FlatList
                horizontal
                data={SUGGESTED_PROMPTS}
                keyExtractor={(p) => p}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestChip}
                    onPress={() => sendMessage(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.suggestText}>{item}</Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}
              />
            </View>
          )}

          {/* New Chat pill */}
          {messages.length > 1 && !loading && (
            <TouchableOpacity style={styles.newChatPill} onPress={startNewChat} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={14} color={COLORS.purpleLight} />
              <Text style={styles.newChatText}>New Chat</Text>
            </TouchableOpacity>
          )}

          {/* Input */}
          <View style={styles.inputRow}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="Ask anything or say 'log chicken to lunch'…"
                placeholderTextColor={COLORS.whiteAlpha40}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage()}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <LinearGradient colors={GRADIENT_BTN as any} style={StyleSheet.absoluteFill} />
              <Ionicons name="send" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  aiIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  aiStatus: { color: COLORS.white, fontSize: 14, fontWeight: '700', maxWidth: 200 },
  aiModel: { color: COLORS.whiteAlpha40, fontSize: 10, marginTop: 2 },
  dateBadge: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)',
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4,
  },
  dateBadgeText: { color: COLORS.purpleLight, fontSize: 10, fontWeight: '700' },

  messageList: { paddingHorizontal: 18, paddingBottom: 8 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, overflow: 'hidden',
  },

  toolActionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 5 },
  toolChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  toolChipText: { color: COLORS.purpleLight, fontSize: 11, fontWeight: '500' },

  bubble: { borderRadius: 18, padding: 14 },
  bubbleUser: {
    backgroundColor: COLORS.crimson,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: COLORS.white },
  bubbleTextAI: { color: COLORS.whiteAlpha80 },

  typingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.cardBg, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  typingText: { color: COLORS.whiteAlpha60, fontSize: 13 },

  suggestContainer: { paddingVertical: 10 },
  suggestChip: {
    backgroundColor: COLORS.cardBg, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  suggestText: { color: COLORS.whiteAlpha80, fontSize: 13 },

  newChatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'center',
    backgroundColor: 'rgba(168,85,247,0.10)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)',
    paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 6,
  },
  newChatText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.whiteAlpha08,
  },
  inputBox: {
    flex: 1, backgroundColor: COLORS.inputBg,
    borderRadius: 22, borderWidth: 1, borderColor: COLORS.inputBorder,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120,
  },
  input: { color: COLORS.white, fontSize: 14, lineHeight: 20 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
