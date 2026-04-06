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
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1F2937',
        },
      }}
    >
      {isOperator ? (
        <>
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="customers"
            options={{
              title: 'Customers',
              tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="faults"
            options={{
              title: 'Faults',
              tabBarIcon: ({ color, size }) => <Ionicons name="warning-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="ai-support"
            options={{
              title: 'AI Support',
              tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
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
              title: 'My Faults',
              tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="customer-lookup"
            options={{
              title: 'Customers',
              tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="ai-support"
            options={{
              title: 'AI Support',
              tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
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
