import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});

console.log('[API Service] Initialized with baseURL:', api.defaults.baseURL);

api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});

export async function fetchP2POrders() {
  const res = await api.get('/p2p/orders');
  return res.data.orders || [];
}

export default api;
