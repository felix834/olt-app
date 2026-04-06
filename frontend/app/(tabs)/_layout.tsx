import React from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export default function TabsLayout() {
  const { user, isOperator, isFieldEngineer } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1A1A2E',
          borderTopWidth: 1,
          borderTopColor: '#2D2D44',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        headerStyle: {
          backgroundColor: '#1A1A2E',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#2D2D44',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#FFFFFF',
          letterSpacing: 1,
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      {isOperator ? (
        <>
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Ionicons name="apps" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="customers"
            options={{
              title: 'Customers',
              tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="faults"
            options={{
              title: 'Faults',
              tabBarIcon: ({ color, size }) => <Ionicons name="alert-circle" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="ai-support"
            options={{
              title: 'AI Support',
              tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
            }}
          />
          <Tabs.Screen name="assigned-faults" options={{ href: null }} />
          <Tabs.Screen name="customer-lookup" options={{ href: null }} />
        </>
      ) : (
        <>
          <Tabs.Screen
            name="assigned-faults"
            options={{
              title: 'My Tasks',
              tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="customer-lookup"
            options={{
              title: 'Search',
              tabBarIcon: ({ color, size }) => <Ionicons name="search-circle" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="ai-support"
            options={{
              title: 'AI Help',
              tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
            }}
          />
          <Tabs.Screen name="dashboard" options={{ href: null }} />
          <Tabs.Screen name="customers" options={{ href: null }} />
          <Tabs.Screen name="faults" options={{ href: null }} />
        </>
      )}
    </Tabs>
  );
}
