import { FoodAnalysisResult, HealthScore, ChatMessage, NutritionGoals, DailyLog, FoodItem, MealType } from '../types/nutrition';
import { getLogForDate, getWeekLogs, addFoodToMeal, updateWater } from './mealStorage';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const BASE_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';

// ── Raw Claude call returning full response ────────────────────────────────

async function callClaudeRaw(body: object): Promise<{ content: any[]; stop_reason: string }> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return { content: data.content ?? [], stop_reason: data.stop_reason ?? 'end_turn' };
}

async function callClaude(body: object): Promise<string> {
  const { content } = await callClaudeRaw(body);
  const block = content.find((b: any) => b.type === 'text');
  return block?.text ?? '';
}

// ── Food image analysis ────────────────────────────────────────────────────

export async function analyzeFoodImage(base64: string): Promise<FoodAnalysisResult> {
  const text = await callClaude({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: `Analyze this food image and return a JSON object with EXACTLY this structure (no markdown, no extra text, just the JSON):
{
  "name": "Food name",
  "macros": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number
  },
  "healthScore": 1|2|3|4|5,
  "healthReason": "Brief reason for the score",
  "tips": "One actionable nutrition tip",
  "servingSize": "Estimated serving size",
  "ingredients": ["main", "ingredients"],
  "allergens": ["any", "allergens"]
}

Health score: 1=Very Unhealthy, 2=Unhealthy, 3=Moderate, 4=Healthy, 5=Super Healthy
Macros in grams (protein/carbs/fat/fiber/sugar), sodium in mg, calories as kcal.`,
          },
        ],
      },
    ],
  });

  return parseAnalysisResponse(text);
}

// ── Text-based nutrition estimation ───────────────────────────────────────

export async function estimateFoodNutrition(dishName: string): Promise<FoodAnalysisResult> {
  const text = await callClaude({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Analyze the nutritional value of "${dishName}" and return a JSON object with EXACTLY this structure (no markdown, no extra text, just the JSON):
{
  "name": "${dishName}",
  "macros": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number
  },
  "healthScore": 1|2|3|4|5,
  "healthReason": "Brief reason for the score",
  "tips": "One actionable nutrition tip",
  "servingSize": "Standard serving size",
  "ingredients": ["main", "ingredients"],
  "allergens": ["any", "allergens"]
}

Health score: 1=Very Unhealthy, 2=Unhealthy, 3=Moderate, 4=Healthy, 5=Super Healthy
Macros in grams (protein/carbs/fat/fiber/sugar), sodium in mg, calories as kcal.`,
      },
    ],
  });

  return parseAnalysisResponse(text);
}

function parseAnalysisResponse(text: string): FoodAnalysisResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const json = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return {
      name: json.name ?? 'Unknown Food',
      macros: {
        calories: Math.round(json.macros?.calories ?? 0),
        protein: Math.round(json.macros?.protein ?? 0),
        carbs: Math.round(json.macros?.carbs ?? 0),
        fat: Math.round(json.macros?.fat ?? 0),
        fiber: Math.round(json.macros?.fiber ?? 0),
        sugar: Math.round(json.macros?.sugar ?? 0),
        sodium: Math.round(json.macros?.sodium ?? 0),
      },
      healthScore: (Math.min(5, Math.max(1, Math.round(json.healthScore ?? 3))) as HealthScore),
      healthReason: json.healthReason ?? '',
      tips: json.tips ?? '',
      servingSize: json.servingSize ?? '1 serving',
      ingredients: json.ingredients ?? [],
      allergens: json.allergens ?? [],
    };
  } catch {
    return {
      name: 'Unknown Food',
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      healthScore: 3,
      healthReason: 'Could not analyze this food',
      tips: 'Try taking a clearer photo or entering the food name manually.',
      servingSize: '1 serving',
    };
  }
}

// ── Simple (non-agent) chat — kept as fallback ─────────────────────────────

export async function chatWithNutritionAI(
  messages: ChatMessage[],
  userGoals: NutritionGoals,
  todayLog: DailyLog | null,
): Promise<string> {
  const systemPrompt = `You are a friendly, expert nutrition coach and dietitian. You help users with their nutrition goals, meal planning, food choices, and healthy eating habits.

Current user's daily goals:
- Calories: ${userGoals.dailyCalories} kcal
- Protein: ${userGoals.dailyProtein}g
- Carbs: ${userGoals.dailyCarbs}g
- Fat: ${userGoals.dailyFat}g
- Water: ${userGoals.dailyWater} glasses

${
  todayLog
    ? `Today's progress (${todayLog.date}):
- Calories: ${todayLog.totalCalories} / ${userGoals.dailyCalories} kcal (${Math.round((todayLog.totalCalories / userGoals.dailyCalories) * 100)}%)
- Protein: ${todayLog.totalProtein}g / ${userGoals.dailyProtein}g
- Carbs: ${todayLog.totalCarbs}g / ${userGoals.dailyCarbs}g
- Fat: ${todayLog.totalFat}g / ${userGoals.dailyFat}g
- Water: ${todayLog.waterGlasses} / ${userGoals.dailyWater} glasses`
    : 'No meals logged today yet.'
}

Keep responses concise, practical, and encouraging. Use specific numbers when relevant.`;

  const apiMessages = messages.slice(-12).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  return callClaude({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: apiMessages,
  });
}

// ── Agent tools definition (date-aware) ───────────────────────────────────

function makeAgentTools(dateLabel: string) {
  return [
    {
      name: 'get_today_nutrition',
      description: `Get the user's full nutrition data for ${dateLabel}: calories consumed vs goal, macro breakdown, water intake, and every meal/item logged.`,
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_week_summary',
      description: 'Get a 7-day nutrition history showing daily calories, protein, carbs, fat, and water. Use this for trend questions or weekly analysis.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'log_food_item',
      description: `Log a food item into the user's meal log for ${dateLabel}. Always call estimate_food_nutrition first to get accurate macros unless the user provides them.`,
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the food item' },
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          calories: { type: 'number', description: 'Calories in kcal' },
          protein: { type: 'number', description: 'Protein in grams' },
          carbs: { type: 'number', description: 'Carbohydrates in grams' },
          fat: { type: 'number', description: 'Fat in grams' },
        },
        required: ['name', 'meal_type', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
    {
      name: 'update_water_intake',
      description: `Update the user's total water glasses consumed for ${dateLabel}.`,
      input_schema: {
        type: 'object',
        properties: {
          glasses: { type: 'number', description: 'Total glasses of water (cumulative, not additional)' },
        },
        required: ['glasses'],
      },
    },
    {
      name: 'estimate_food_nutrition',
      description: 'Look up the nutritional content of any food, dish, or ingredient by name. Returns calories, protein, carbs, fat, and a health score.',
      input_schema: {
        type: 'object',
        properties: {
          food_name: { type: 'string', description: 'Name of the food or dish to look up' },
        },
        required: ['food_name'],
      },
    },
  ];
}

// ── Tool executor ──────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: Record<string, any>,
  uid: string,
  goals: NutritionGoals,
  targetDate: string,
): Promise<string> {
  switch (toolName) {
    case 'get_today_nutrition': {
      const log = await getLogForDate(uid, targetDate);
      return JSON.stringify({
        date: log.date,
        calories: {
          consumed: log.totalCalories,
          goal: goals.dailyCalories,
          remaining: Math.max(0, goals.dailyCalories - log.totalCalories),
          percentComplete: Math.round((log.totalCalories / goals.dailyCalories) * 100),
        },
        protein: { consumed: log.totalProtein, goal: goals.dailyProtein },
        carbs: { consumed: log.totalCarbs, goal: goals.dailyCarbs },
        fat: { consumed: log.totalFat, goal: goals.dailyFat },
        water: { glasses: log.waterGlasses, goal: goals.dailyWater },
        meals: log.meals.map((m) => ({
          type: m.type,
          calories: m.totalCalories,
          protein: m.totalProtein,
          carbs: m.totalCarbs,
          fat: m.totalFat,
          items: m.items.map((i) => ({
            name: i.name,
            calories: i.macros.calories,
            protein: i.macros.protein,
            carbs: i.macros.carbs,
            fat: i.macros.fat,
          })),
        })),
      });
    }

    case 'get_week_summary': {
      const logs = await getWeekLogs(uid);
      const days = logs.map((l) => ({
        date: l.date,
        calories: l.totalCalories,
        protein: l.totalProtein,
        carbs: l.totalCarbs,
        fat: l.totalFat,
        water: l.waterGlasses,
      }));
      const n = days.length || 1;
      return JSON.stringify({
        days,
        averages: {
          calories: Math.round(days.reduce((s, d) => s + d.calories, 0) / n),
          protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / n),
          carbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / n),
          fat: Math.round(days.reduce((s, d) => s + d.fat, 0) / n),
        },
        goals: {
          dailyCalories: goals.dailyCalories,
          dailyProtein: goals.dailyProtein,
          dailyCarbs: goals.dailyCarbs,
          dailyFat: goals.dailyFat,
        },
      });
    }

    case 'log_food_item': {
      const { name, meal_type, calories, protein, carbs, fat } = input;
      const foodItem: FoodItem = {
        id: Date.now().toString(),
        name,
        macros: { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) },
        healthScore: 3,
        healthReason: 'Logged via AI coach',
        addedAt: Date.now(),
      };
      const updated = await addFoodToMeal(uid, meal_type as MealType, foodItem, targetDate);
      return JSON.stringify({
        success: true,
        logged: { name, meal_type, calories, protein, carbs, fat },
        newDayTotals: {
          calories: updated.totalCalories,
          protein: updated.totalProtein,
          carbs: updated.totalCarbs,
          fat: updated.totalFat,
        },
      });
    }

    case 'update_water_intake': {
      const { glasses } = input;
      await updateWater(uid, Math.round(glasses), targetDate);
      return JSON.stringify({ success: true, glasses: Math.round(glasses) });
    }

    case 'estimate_food_nutrition': {
      try {
        const result = await estimateFoodNutrition(input.food_name);
        return JSON.stringify({
          name: result.name,
          macros: result.macros,
          healthScore: result.healthScore,
          healthReason: result.healthReason,
          servingSize: result.servingSize,
        });
      } catch {
        return JSON.stringify({ error: 'Could not estimate nutrition for this food.' });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

function toolActionLabel(toolName: string, input: Record<string, any>): string {
  switch (toolName) {
    case 'get_today_nutrition': return 'Checked today\'s nutrition';
    case 'get_week_summary': return 'Retrieved 7-day history';
    case 'log_food_item': return `Logged ${input.name} to ${input.meal_type}`;
    case 'update_water_intake': return `Updated water to ${input.glasses} glasses`;
    case 'estimate_food_nutrition': return `Looked up nutrition for "${input.food_name}"`;
    default: return toolName;
  }
}

// ── Agentic chat with tool-use loop ───────────────────────────────────────

export async function agentChatWithNutritionAI(
  messages: ChatMessage[],
  uid: string,
  userGoals: NutritionGoals,
  targetDate?: string,
): Promise<{ reply: string; actionsPerformed: string[] }> {
  const today = new Date().toISOString().split('T')[0];
  const date = targetDate ?? today;
  const isToday = date === today;
  const dateLabel = isToday
    ? 'today'
    : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const systemPrompt = `You are an expert AI nutrition coach with real-time access to the user's data.

User's daily nutrition goals:
- Calories: ${userGoals.dailyCalories} kcal
- Protein: ${userGoals.dailyProtein}g
- Carbs: ${userGoals.dailyCarbs}g
- Fat: ${userGoals.dailyFat}g
- Water: ${userGoals.dailyWater} glasses

You are currently working with data for ${dateLabel} (${date}).${!isToday ? `\nThis is NOT today (${today}). All data reads and writes — logging food, checking intake, updating water — apply to ${date}.` : ''}

Guidelines:
- Use get_today_nutrition proactively when the user asks about their intake, progress, or remaining macros.
- Use get_week_summary for trend or pattern questions.
- To log food: call estimate_food_nutrition first (to get accurate macros), then log_food_item.
- Be specific with numbers. Celebrate wins. Give actionable advice.
- Keep responses concise and encouraging.`;

  // Filter out intro messages and map to API format
  const apiMessages: any[] = messages
    .filter((m) => m.id !== 'intro')
    .slice(-14)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Ensure conversation starts with a user message
  while (apiMessages.length > 0 && apiMessages[0].role !== 'user') {
    apiMessages.shift();
  }

  if (apiMessages.length === 0) {
    return { reply: 'How can I help you with your nutrition today?', actionsPerformed: [] };
  }

  const agentTools = makeAgentTools(dateLabel);
  const conversationMessages: any[] = [...apiMessages];
  const actionsPerformed: string[] = [];
  const MAX_ITERATIONS = 6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await callClaudeRaw({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      tools: agentTools,
      messages: conversationMessages,
    });

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
      const textBlock = response.content.find((b: any) => b.type === 'text');
      return {
        reply: textBlock?.text ?? 'I had trouble formulating a response. Please try again.',
        actionsPerformed,
      };
    }

    if (response.stop_reason === 'tool_use') {
      // Append the full assistant content (including thinking blocks) to history
      conversationMessages.push({ role: 'assistant', content: response.content });

      const toolUseBlocks = response.content.filter((b: any) => b.type === 'tool_use');
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block: any) => {
          const result = await executeTool(block.name, block.input ?? {}, uid, userGoals, date);
          actionsPerformed.push(toolActionLabel(block.name, block.input ?? {}));
          return { type: 'tool_result', tool_use_id: block.id, content: result };
        }),
      );

      conversationMessages.push({ role: 'user', content: toolResults });
    } else {
      // Unexpected stop reason — try to extract text
      const textBlock = response.content.find((b: any) => b.type === 'text');
      return {
        reply: textBlock?.text ?? 'Something unexpected happened.',
        actionsPerformed,
      };
    }
  }

  return {
    reply: 'I ran into an issue processing your request. Please try again.',
    actionsPerformed,
  };
}
