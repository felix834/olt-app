import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function FaultsScreen() {
  const [faults, setFaults] = useState([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [faultType, setFaultType] = useState('No Internet');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFaults();
  }, [filter]);

  const loadFaults = async () => {
    try {
      const statusFilter = filter === 'all' ? undefined : filter;
      const data = await api.getFaults(statusFilter);
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

  const handleCreateFault = async () => {
    if (!customerId || !faultType || !description) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setCreating(true);
    try {
      await api.createFault({
        customer_id: customerId,
        fault_type: faultType,
        description: description,
        priority: priority,
      });
      Alert.alert('Success', 'Fault ticket created');
      setShowCreateModal(false);
      setCustomerId('');
      setDescription('');
      loadFaults();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create fault');
    } finally {
      setCreating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const renderFault = ({ item }: any) => (
    <TouchableOpacity
      style={styles.faultCard}
      onPress={() => router.push(`/fault-detail/${item.id}`)}
    >
      <View style={styles.faultHeader}>
        <View style={styles.faultTitleContainer}>
          <LinearGradient
            colors={item.priority === 'high' ? ['#f43f5e', '#e11d48'] : item.priority === 'medium' ? ['#f59e0b', '#d97706'] : ['#3b82f6', '#2563eb']}
            style={styles.priorityIconContainer}
          >
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.faultInfo}>
            <Text style={styles.ticketId}>{item.ticket_id}</Text>
            <Text style={styles.customerName}>{item.customer_name}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} type="fault" />
      </View>

      <View style={styles.faultBody}>
        <View style={styles.faultTypeRow}>
          <Ionicons name="bug" size={16} color="#8B5CF6" />
          <Text style={styles.faultType}>{item.fault_type}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      </View>

      <View style={styles.faultFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="time" size={14} color="#6B7280" />
          <Text style={styles.footerText}>
            {format(new Date(item.created_at), 'MMM dd, HH:mm')}
          </Text>
        </View>
        {item.assigned_to_name && (
          <View style={styles.footerItem}>
            <Ionicons name="person" size={14} color="#06b6d4" />
            <Text style={styles.footerText}>{item.assigned_to_name}</Text>
          </View>
        )}
        {item.location_verified && (
          <View style={styles.footerItem}>
            <Ionicons name="location" size={14} color="#10B981" />
            <Text style={[styles.footerText, { color: '#10B981' }]}>Verified</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'open', 'assigned', 'in_progress', 'resolved'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={faults}
        renderItem={renderFault}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient colors={['#667eea20', '#764ba220']} style={styles.emptyIconContainer}>
              <Ionicons name="checkmark-done" size={48} color="#8B5CF6" />
            </LinearGradient>
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No faults found'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Fault Ticket</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Customer ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CUST10001"
                placeholderTextColor="#6B7280"
                value={customerId}
                onChangeText={setCustomerId}
              />

              <Text style={styles.inputLabel}>Fault Type</Text>
              <View style={styles.optionsRow}>
                {['No Internet', 'Slow Speed', 'Intermittent', 'Hardware Issue'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionButton, faultType === type && styles.optionButtonActive]}
                    onPress={() => setFaultType(type)}
                  >
                    <Text style={[styles.optionText, faultType === type && styles.optionTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.optionsRow}>
                {['low', 'medium', 'high'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityButton, priority === p && { borderColor: getPriorityColor(p) }]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.priorityText, priority === p && { color: getPriorityColor(p) }]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the issue..."
                placeholderTextColor="#6B7280"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateFault}
                disabled={creating}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.createButtonGradient}
                >
                  <Text style={styles.createButtonText}>
                    {creating ? 'Creating...' : 'Create Ticket'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  filterContainer: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D44',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D44',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  faultCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  faultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  faultTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  priorityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faultInfo: {
    flex: 1,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  faultBody: {
    marginBottom: 12,
  },
  faultTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  faultType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E5E7EB',
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  faultFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D44',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0F0F1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
    padding: 12,
    color: '#FFFFFF',
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0F0F1E',
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  optionButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  optionText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  priorityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0F0F1E',
    borderWidth: 2,
    borderColor: '#2D2D44',
  },
  priorityText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  createButton: {
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});