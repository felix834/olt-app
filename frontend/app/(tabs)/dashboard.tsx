import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';

export default function DashboardScreen() {
  const [olts, setOLTs] = useState([]);
  const [faultStats, setFaultStats] = useState<any>(null);
  const [oltStats, setOLTStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [oltsData, faultsData, oltAnalytics] = await Promise.all([
        api.getOLTs(),
        api.getFaultAnalytics(),
        api.getOLTAnalytics(),
      ]);
      setOLTs(oltsData.slice(0, 5));
      setFaultStats(faultsData);
      setOLTStats(oltAnalytics);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="server-outline" size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{oltStats?.total_olts || 0}</Text>
          <Text style={styles.statLabel}>Total OLTs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
          <Text style={styles.statValue}>{oltStats?.active_olts || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="warning-outline" size={24} color="#EF4444" />
          <Text style={styles.statValue}>{faultStats?.open_faults || 0}</Text>
          <Text style={styles.statLabel}>Open Faults</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
          <Ionicons name="time-outline" size={24} color="#F97316" />
          <Text style={styles.statValue}>{faultStats?.in_progress || 0}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>OLT Devices</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {olts.map((olt: any) => (
          <TouchableOpacity
            key={olt.id}
            style={styles.oltCard}
            onPress={() => router.push(`/olt-detail/${olt.id}`)}
          >
            <View style={styles.oltCardHeader}>
              <View>
                <Text style={styles.oltName}>{olt.name}</Text>
                <Text style={styles.oltLocation}>{olt.location}</Text>
              </View>
              <StatusBadge status={olt.status} type="olt" />
            </View>
            <View style={styles.oltCardBody}>
              <View style={styles.oltStat}>
                <Ionicons name="hardware-chip-outline" size={16} color="#6B7280" />
                <Text style={styles.oltStatText}>
                  {olt.active_ports}/{olt.total_ports} Ports
                </Text>
              </View>
              <View style={styles.oltStat}>
                <Ionicons name="wifi-outline" size={16} color="#6B7280" />
                <Text style={styles.oltStatText}>{olt.ip_address}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  oltCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  oltCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  oltName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  oltLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  oltCardBody: {
    flexDirection: 'row',
    gap: 16,
  },
  oltStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  oltStatText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
