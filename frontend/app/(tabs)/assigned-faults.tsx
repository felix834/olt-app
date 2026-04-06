import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function AssignedFaultsScreen() {
  const [faults, setFaults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFaults();
  }, []);

  const loadFaults = async () => {
    try {
      const data = await api.getFaults(undefined, true);
      setFaults(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load faults');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFaults();
    setRefreshing(false);
  };

  const renderFault = ({ item }: any) => (
    <TouchableOpacity
      style={styles.faultCard}
      onPress={() => router.push(`/field-fault/${item.id}`)}
    >
      <View style={styles.faultHeader}>
        <Text style={styles.ticketId}>{item.ticket_id}</Text>
        <StatusBadge status={item.status} type="fault" />
      </View>

      <Text style={styles.customerName}>{item.customer_name}</Text>
      <Text style={styles.faultType}>{item.fault_type}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.footerText}>
            {format(new Date(item.created_at), 'MMM dd, HH:mm')}
          </Text>
        </View>
        {item.location_verified ? (
          <View style={styles.footerItem}>
            <Ionicons name="location" size={14} color="#10B981" />
            <Text style={[styles.footerText, { color: '#10B981' }]}>Verified</Text>
          </View>
        ) : (
          <View style={styles.footerItem}>
            <Ionicons name="location-outline" size={14} color="#F59E0B" />
            <Text style={[styles.footerText, { color: '#F59E0B' }]}>Pending</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={faults}
        renderItem={renderFault}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {loading ? 'Loading faults...' : 'No assigned faults'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
  },
  faultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  faultType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});
