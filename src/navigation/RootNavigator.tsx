import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import AppTabs from './AppTabs';
import AdminTabs from './AdminTabs';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.crimson} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {user ? (
        role === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminTabs} />
        ) : (
          <Stack.Screen name="App" component={AppTabs} />
        )
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
