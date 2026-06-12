import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import { View } from 'react-native';

const Tab = createBottomTabNavigator();

const PURPLE = '#7B2FBE';
const PURPLE_DARK = '#0D1B2A';

export default function AdminTabs() {
  const { profileComplete } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PURPLE_DARK,
          borderTopColor: 'rgba(168,85,247,0.15)',
          borderTopWidth: 1,
          paddingBottom: 10,
          paddingTop: 8,
          height: 72,
        },
        tabBarActiveTintColor: COLORS.purpleLight,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Overview: ['grid', 'grid-outline'],
            Users: ['people', 'people-outline'],
            Profile: ['person', 'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          const iconName = focused ? active : inactive;

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
                      borderColor: PURPLE_DARK,
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
      <Tab.Screen name="Overview" component={AdminDashboardScreen} />
      <Tab.Screen name="Users" component={AdminUsersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
