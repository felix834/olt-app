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
      if (lowerStatus === 'active') return '#10B981';
      if (lowerStatus === 'fault') return '#EF4444';
      return '#6B7280';
    }
    
    if (type === 'customer' || type === 'onu') {
      if (lowerStatus === 'active' || lowerStatus === 'online') return '#10B981';
      if (lowerStatus === 'faulty' || lowerStatus === 'offline') return '#EF4444';
      if (lowerStatus === 'low_power') return '#F59E0B';
      return '#6B7280';
    }
    
    if (type === 'fault') {
      if (lowerStatus === 'resolved' || lowerStatus === 'closed') return '#10B981';
      if (lowerStatus === 'open') return '#EF4444';
      if (lowerStatus === 'in_progress') return '#3B82F6';
      return '#F59E0B';
    }
    
    if (type === 'billing') {
      if (lowerStatus === 'paid') return '#10B981';
      if (lowerStatus === 'overdue') return '#EF4444';
      return '#F59E0B';
    }
    
    return '#6B7280';
  };

  return (
    <View style={[styles.badge, { backgroundColor: getColor() }]}>
      <Text style={styles.text}>{status.replace('_', ' ').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
