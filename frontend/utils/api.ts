import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${BACKEND_URL}/api`,
      timeout: 30000,
    });

    // Add auth token to requests
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // OLT APIs
  async getOLTs() {
    const response = await this.client.get('/olts');
    return response.data;
  }

  async getOLT(id: string) {
    const response = await this.client.get(`/olts/${id}`);
    return response.data;
  }

  async getOLTPorts(id: string) {
    const response = await this.client.get(`/olts/${id}/ports`);
    return response.data;
  }

  // Customer APIs
  async getCustomers(search?: string, status?: string) {
    const params: any = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await this.client.get('/customers', { params });
    return response.data;
  }

  async getCustomer(id: string) {
    const response = await this.client.get(`/customers/${id}`);
    return response.data;
  }

  // ONU APIs
  async getCustomerONUs(customerId: string) {
    const response = await this.client.get(`/onus/customer/${customerId}`);
    return response.data;
  }

  async getONU(id: string) {
    const response = await this.client.get(`/onus/${id}`);
    return response.data;
  }

  async unbindMAC(onuId: string, reason: string) {
    const response = await this.client.post(`/onus/${onuId}/unbind-mac`, { reason });
    return response.data;
  }

  // Fault APIs
  async getFaults(status?: string, assignedToMe?: boolean) {
    const params: any = {};
    if (status) params.status = status;
    if (assignedToMe) params.assigned_to_me = true;
    const response = await this.client.get('/faults', { params });
    return response.data;
  }

  async getFault(id: string) {
    const response = await this.client.get(`/faults/${id}`);
    return response.data;
  }

  async createFault(data: any) {
    const response = await this.client.post('/faults', data);
    return response.data;
  }

  async updateFault(id: string, data: any) {
    const response = await this.client.put(`/faults/${id}`, data);
    return response.data;
  }

  // AI APIs
  async sendAIChat(message: string, context?: string) {
    const response = await this.client.post('/ai/chat', { message, context });
    return response.data;
  }

  // Analytics APIs
  async getFaultAnalytics() {
    const response = await this.client.get('/analytics/faults');
    return response.data;
  }

  async getOLTAnalytics() {
    const response = await this.client.get('/analytics/olts');
    return response.data;
  }
}

export const api = new ApiClient();
