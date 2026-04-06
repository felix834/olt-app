import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState<any>(null);
  const [onus, setONUs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      const customerData = await api.getCustomer(id as string);
      setCustomer(customerData);
      
      if (customerData.customer_id) {
        const onusData = await api.getCustomerONUs(customerData.customer_id);
        setONUs(onusData);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomer();
    setRefreshing(false);
  };

  const handleUnbindMAC = async (onuId: string) => {
    Alert.alert(
      'Unbind MAC Address',
      'Are you sure you want to unbind this MAC address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unbind',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.unbindMAC(onuId, 'Customer request');
              Alert.alert('Success', 'MAC address unbound successfully');
              loadCustomer();
            } catch (error) {
              Alert.alert('Error', 'Failed to unbind MAC address');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text>Customer not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.customerId}>ID: {customer.customer_id}</Text>
        <StatusBadge status={customer.connection_status} type="customer" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{customer.phone}</Text>
          </View>
          {customer.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{customer.email}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{customer.address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Broadband Plan</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="wifi-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{customer.broadband_plan}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>₹{customer.billing_amount}/month</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Billing Status:</Text>
            <StatusBadge status={customer.billing_status} type="billing" />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ONU Devices</Text>
        {onus.length > 0 ? (
          onus.map((onu) => (
            <View key={onu.id} style={styles.onuCard}>
              <View style={styles.onuHeader}>
                <View>
                  <Text style={styles.onuId}>{onu.onu_id}</Text>
                  <Text style={styles.macAddress}>{onu.mac_address}</Text>
                </View>
                <StatusBadge status={onu.status} type="onu" />
              </View>

              <View style={styles.onuStats}>
                <View style={styles.onuStat}>
                  <Ionicons name="radio-outline" size={16} color="#6B7280" />
                  <Text style={styles.onuStatLabel}>Power Level:</Text>
                  <Text style={[
                    styles.onuStatValue,
                    { color: onu.power_level_dbm > -25 ? '#10B981' : onu.power_level_dbm > -27 ? '#F59E0B' : '#EF4444' }
                  ]}>
                    {onu.power_level_dbm} dBm
                  </Text>
                </View>
                <View style={styles.onuStat}>
                  <Ionicons name="hardware-chip-outline" size={16} color="#6B7280" />
                  <Text style={styles.onuStatLabel}>Port:</Text>
                  <Text style={styles.onuStatValue}>{onu.port_number}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.unbindButton}
                onPress={() => handleUnbindMAC(onu.onu_id)}
              >
                <Ionicons name="unlink-outline" size={16} color="#EF4444" />
                <Text style={styles.unbindText}>Unbind MAC</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No ONU devices found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingTop: 100,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  onuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  onuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  onuId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  macAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  onuStats: {
    gap: 8,
    marginBottom: 12,
  },
  onuStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onuStatLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  onuStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  unbindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    marginTop: 8,
  },
  unbindText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
