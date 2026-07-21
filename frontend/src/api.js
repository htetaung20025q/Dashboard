import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do not clear tokens or redirect if it is a login attempt returning 401
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await api.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const employeeAPI = {
  list: async () => {
    const response = await api.get('/employees');
    return response.data;
  },
  create: async (employeeData) => {
    const response = await api.post('/employees', employeeData);
    return response.data;
  },
  update: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
};

export const attendanceAPI = {
  status: async () => {
    const response = await api.get('/attendance/status');
    return response.data;
  },
  checkIn: async () => {
    const response = await api.post('/attendance/check-in');
    return response.data;
  },
  checkOut: async () => {
    const response = await api.post('/attendance/check-out');
    return response.data;
  },
  history: async () => {
    const response = await api.get('/attendance');
    return response.data;
  },
};

export const financeAPI = {
  records: async () => {
    const response = await api.get('/finance/records');
    return response.data;
  },
  create: async (recordData) => {
    const response = await api.post('/finance/records', recordData);
    return response.data;
  },
  stats: async () => {
    const response = await api.get('/finance/stats');
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/finance/records/${id}`);
    return response.data;
  },
};

export const reportsAPI = {
  exportCSV: (type) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/reports/export/csv?type=${type}&token=${token}`;
  },
  exportPDF: (type) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/reports/export/pdf?type=${type}&token=${token}`;
  },
};

export default api;
