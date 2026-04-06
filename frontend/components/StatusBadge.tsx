import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
  type?: 'olt' | 'customer' | 'fault' | 'onu' | 'billing';
}

export default function StatusBadge({ status, type = 'olt' }: StatusBadgeProps) {
  const getColor = () => {
    const lowerStatus = status.toLowerCase();
    
    if (type === 'olt') {
      if (lowerStatus === 'active') return { bg: '#10b98120', text: '#10b981', glow: '#10b981' };
      if (lowerStatus === 'fault') return { bg: '#ef444420', text: '#ef4444', glow: '#ef4444' };
      return { bg: '#6b728020', text: '#9ca3af', glow: '#6b7280' };
    }
    
    if (type === 'customer' || type === 'onu') {
      if (lowerStatus === 'active' || lowerStatus === 'online') return { bg: '#10b98120', text: '#10b981', glow: '#10b981' };
      if (lowerStatus === 'faulty' || lowerStatus === 'offline') return { bg: '#ef444420', text: '#ef4444', glow: '#ef4444' };
      if (lowerStatus === 'low_power') return { bg: '#f59e0b20', text: '#f59e0b', glow: '#f59e0b' };
      return { bg: '#6b728020', text: '#9ca3af', glow: '#6b7280' };
    }
    
    if (type === 'fault') {
      if (lowerStatus === 'resolved' || lowerStatus === 'closed') return { bg: '#10b98120', text: '#10b981', glow: '#10b981' };
      if (lowerStatus === 'open') return { bg: '#ef444420', text: '#ef4444', glow: '#ef4444' };
      if (lowerStatus === 'in_progress') return { bg: '#3b82f620', text: '#3b82f6', glow: '#3b82f6' };
      return { bg: '#f59e0b20', text: '#f59e0b', glow: '#f59e0b' };
    }
    
    if (type === 'billing') {
      if (lowerStatus === 'paid') return { bg: '#10b98120', text: '#10b981', glow: '#10b981' };
      if (lowerStatus === 'overdue') return { bg: '#ef444420', text: '#ef4444', glow: '#ef4444' };
      return { bg: '#f59e0b20', text: '#f59e0b', glow: '#f59e0b' };
    }
    
    return { bg: '#6b728020', text: '#9ca3af', glow: '#6b7280' };
  };

  const colors = getColor();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.text }]}>
      <View style={[styles.indicator, { backgroundColor: colors.text }]} />
      <Text style={[styles.text, { color: colors.text }]}>
        {status.replace('_', ' ').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
