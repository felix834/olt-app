import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';

export default function OLTDetailScreen() {
  const { id } = useLocalSearchParams();
  const [olt, setOLT] = useState<any>(null);
  const [ports, setPorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOLT();
  }, [id]);

  const loadOLT = async () => {
    try {
      const [oltData, portsData] = await Promise.all([
        api.getOLT(id as string),
        api.getOLTPorts(id as string),
      ]);
      setOLT(oltData);
      setPorts(portsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load OLT details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOLT();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!olt) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>OLT not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.header}
      >
        <Text style={styles.oltName}>{olt.name}</Text>
        <Text style={styles.oltLocation}>{olt.location}</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{olt.active_ports}/{olt.total_ports}</Text>
            <Text style={styles.headerStatLabel}>Active Ports</Text>
          </View>
          <View style={styles.headerStat}>
            <StatusBadge status={olt.status} type="olt" />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="wifi" size={20} color="#8B5CF6" />
            <Text style={styles.infoLabel}>IP Address</Text>
            <Text style={styles.infoValue}>{olt.ip_address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#8B5CF6" />
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>{new Date(olt.last_updated).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GE Port Status</Text>
        <View style={styles.portsGrid}>
          {ports.map((port) => (
            <View key={port.port_number} style={styles.portCard}>
              <View style={styles.portHeader}>
                <Text style={styles.portNumber}>Port {port.port_number}</Text>
                <View style={[
                  styles.portIndicator,
                  { backgroundColor: port.status === 'online' ? '#10b981' : port.status === 'degraded' ? '#f59e0b' : '#6b7280' }
                ]} />
              </View>
              <View style={styles.portStats}>
                <View style={styles.portStat}>
                  <Ionicons name="speedometer" size={14} color="#8B5CF6" />
                  <Text style={styles.portStatText}>{port.traffic_mbps.toFixed(1)} Mbps</Text>
                </View>
                <View style={styles.portStat}>
                  <Ionicons name="radio" size={14} color="#06b6d4" />
                  <Text style={styles.portStatText}>{port.connected_onus} ONUs</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
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
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: '#1A1A2E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  header: {
    padding: 24,
    paddingTop: 100,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  oltName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  oltLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerStat: {
    alignItems: 'flex-start',
  },
  headerStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D44',
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  portsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portCard: {
    width: '48%',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  portHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  portIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  portStats: {
    gap: 8,
  },
  portStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portStatText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
