import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>COMMAND CENTER</Text>
            <Text style={styles.headerSubtitle}>REAL-TIME NETWORK OPERATIONS</Text>
          </View>
          <View style={styles.headerIcon}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.iconGradient}>
              <Ionicons name="pulse" size={24} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.statCard}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="server" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.statValue}>{oltStats?.total_olts || 0}</Text>
          <Text style={styles.statLabel}>TOTAL OLTs</Text>
          <View style={styles.statGlow} />
        </LinearGradient>

        <LinearGradient
          colors={['#06b6d4', '#3b82f6']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.statCard}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.statValue}>{oltStats?.active_olts || 0}</Text>
          <Text style={styles.statLabel}>ACTIVE</Text>
          <View style={styles.statGlow} />
        </LinearGradient>

        <LinearGradient
          colors={['#f43f5e', '#e11d48']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.statCard}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="warning" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.statValue}>{faultStats?.open_faults || 0}</Text>
          <Text style={styles.statLabel}>OPEN FAULTS</Text>
          <View style={styles.statGlow} />
        </LinearGradient>

        <LinearGradient
          colors={['#f59e0b', '#d97706']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.statCard}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="time" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.statValue}>{faultStats?.in_progress || 0}</Text>
          <Text style={styles.statLabel}>IN PROGRESS</Text>
          <View style={styles.statGlow} />
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="layers" size={20} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>ACTIVE OLT DEVICES</Text>
              <Text style={styles.sectionSubtitle}>Network Infrastructure Status</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {olts.map((olt: any) => (
          <TouchableOpacity
            key={olt.id}
            style={styles.oltCard}
            onPress={() => router.push(`/olt-detail/${olt.id}`)}
          >
            <View style={styles.oltCardLeft}>
              <LinearGradient
                colors={olt.status === 'active' ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
                style={styles.oltIconContainer}
              >
                <Ionicons 
                  name={olt.status === 'active' ? 'wifi' : 'wifi-off'} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
              <View style={styles.oltInfo}>
                <Text style={styles.oltName}>{olt.name}</Text>
                <Text style={styles.oltLocation}>
                  <Ionicons name="location" size={12} color="#6B7280" /> {olt.location}
                </Text>
                <View style={styles.oltMetrics}>
                  <View style={styles.metric}>
                    <Ionicons name="hardware-chip" size={14} color="#8B5CF6" />
                    <Text style={styles.metricText}>{olt.active_ports}/{olt.total_ports}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="globe" size={14} color="#06b6d4" />
                    <Text style={styles.metricText}>{olt.ip_address}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.oltCardRight}>
              <StatusBadge status={olt.status} type="olt" />
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
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
    backgroundColor: '#0F0F1E',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1E',
  },
  loadingText: {
    color: '#9CA3AF',
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 4,
    letterSpacing: 2,
    fontWeight: '600',
  },
  headerIcon: {
    marginLeft: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  statGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -40,
    right: -40,
  },
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  viewAllText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  oltCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  oltCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  oltIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oltInfo: {
    flex: 1,
  },
  oltName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  oltLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  oltMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  oltCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});