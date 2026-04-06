import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../../utils/api';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function FieldFaultScreen() {
  const { id } = useLocalSearchParams();
  const [fault, setFault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadFault();
    requestLocationPermission();
  }, [id]);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for verification');
    }
  };

  const loadFault = async () => {
    try {
      const data = await api.getFault(id as string);
      setFault(data);
      if (data.resolution_notes) {
        setNotes(data.resolution_notes);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load fault details');
    } finally {
      setLoading(false);
    }
  };

  const captureLocation = async () => {
    setLocationLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      Alert.alert('Success', 'Location captured successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to capture location');
    } finally {
      setLocationLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (notes) {
        updateData.resolution_notes = notes;
      }
      if (location) {
        updateData.gps_location = location;
      }
      
      await api.updateFault(id as string, updateData);
      Alert.alert('Success', 'Fault status updated');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update fault');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!fault) {
    return (
      <View style={styles.centered}>
        <Text>Fault not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.ticketId}>{fault.ticket_id}</Text>
        <StatusBadge status={fault.status} type="fault" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <View style={styles.card}>
          <Text style={styles.customerName}>{fault.customer_name}</Text>
          <Text style={styles.customerId}>Customer ID: {fault.customer_id}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fault Details</Text>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{fault.fault_type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Priority:</Text>
            <View style={[styles.priorityBadge, { backgroundColor: fault.priority === 'high' ? '#FEE2E2' : fault.priority === 'medium' ? '#FEF3C7' : '#DBEAFE' }]}>
              <Text style={[styles.priorityText, { color: fault.priority === 'high' ? '#EF4444' : fault.priority === 'medium' ? '#F59E0B' : '#3B82F6' }]}>
                {fault.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(fault.created_at), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>
          <View style={styles.descriptionRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.description}>{fault.description}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Verification</Text>
        <View style={styles.card}>
          {location || fault.gps_location ? (
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={32} color="#10B981" />
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>GPS Coordinates</Text>
                <Text style={styles.locationValue}>
                  Lat: {(location?.lat || fault.gps_location?.lat)?.toFixed(6)}
                </Text>
                <Text style={styles.locationValue}>
                  Lng: {(location?.lng || fault.gps_location?.lng)?.toFixed(6)}
                </Text>
                {fault.location_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.noLocation}>No location captured yet</Text>
          )}
          
          <TouchableOpacity
            style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]}
            onPress={captureLocation}
            disabled={locationLoading}
          >
            <Ionicons name="navigate" size={20} color="#FFFFFF" />
            <Text style={styles.locationButtonText}>
              {locationLoading ? 'Capturing...' : location ? 'Update Location' : 'Capture GPS Location'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resolution Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes about the fault resolution..."
          placeholderTextColor="#9CA3AF"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.inProgressButton]}
          onPress={() => updateStatus('in_progress')}
        >
          <Text style={styles.actionButtonText}>Mark In Progress</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.resolveButton]}
          onPress={() => updateStatus('resolved')}
        >
          <Text style={styles.actionButtonText}>Mark Resolved</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ticketId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerId: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionRow: {
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 8,
    lineHeight: 20,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 13,
    color: '#6B7280',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  verifiedText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  noLocation: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  actions: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  inProgressButton: {
    backgroundColor: '#3B82F6',
  },
  resolveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
