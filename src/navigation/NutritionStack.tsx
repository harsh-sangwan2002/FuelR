import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NutritionHomeScreen from '../screens/nutrition/NutritionHomeScreen';
import FoodScanScreen from '../screens/nutrition/FoodScanScreen';
import AddFoodScreen from '../screens/nutrition/AddFoodScreen';
import NutritionChatScreen from '../screens/nutrition/NutritionChatScreen';
import NutritionGoalsScreen from '../screens/nutrition/NutritionGoalsScreen';
import MealHistoryScreen from '../screens/nutrition/MealHistoryScreen';
import ChatHistoryScreen from '../screens/nutrition/ChatHistoryScreen';

export type NutritionStackParamList = {
  NutritionHome: undefined;
  FoodScan: { mealType?: string; targetDate?: string } | undefined;
  AddFood: { mealType?: string; targetDate?: string } | undefined;
  NutritionChat: { sessionId?: string; targetDate?: string } | undefined;
  NutritionGoals: undefined;
  MealHistory: undefined;
  ChatHistory: undefined;
};

const Stack = createNativeStackNavigator<NutritionStackParamList>();

export default function NutritionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="NutritionHome" component={NutritionHomeScreen} />
      <Stack.Screen name="FoodScan" component={FoodScanScreen} />
      <Stack.Screen name="AddFood" component={AddFoodScreen} />
      <Stack.Screen name="NutritionChat" component={NutritionChatScreen} />
      <Stack.Screen name="NutritionGoals" component={NutritionGoalsScreen} />
      <Stack.Screen name="MealHistory" component={MealHistoryScreen} />
      <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} />
    </Stack.Navigator>
  );
}
