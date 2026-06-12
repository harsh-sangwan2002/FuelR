import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NutritionStack from './NutritionStack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();

const WorkoutScreen = () => (
  <PlaceholderScreen title="Workouts" icon="barbell-outline" subtitle="Log workouts, sets, and reps here." />
);
const ProgressScreen = () => (
  <PlaceholderScreen title="Progress" icon="trending-up-outline" subtitle="View your fitness & nutrition trends here." />
);

export default function AppTabs() {
  const { profileComplete } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A000F',
          borderTopColor: 'rgba(255,255,255,0.07)',
          borderTopWidth: 1,
          paddingBottom: 10,
          paddingTop: 8,
          height: 72,
        },
        tabBarActiveTintColor: COLORS.crimson,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Home: ['home', 'home-outline'],
            Nutrition: ['nutrition', 'nutrition-outline'],
            Workout: ['barbell', 'barbell-outline'],
            Progress: ['trending-up', 'trending-up-outline'],
            Profile: ['person', 'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          const iconName = (focused ? active : inactive) as any;

          if (route.name === 'Profile') {
            return (
              <View>
                <Ionicons name={iconName} size={focused ? size + 1 : size} color={color} />
                {!profileComplete && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: COLORS.crimson,
                      borderWidth: 2,
                      borderColor: '#0A000F',
                    }}
                  />
                )}
              </View>
            );
          }

          return <Ionicons name={iconName} size={focused ? size + 1 : size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Nutrition" component={NutritionStack} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
