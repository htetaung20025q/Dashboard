import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  register: async (regData) => {
    const response = await api.post('/auth/register-employee', regData);
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

export const leavesAPI = {
  list: async () => {
    const response = await api.get('/leaves');
    return response.data;
  },
  apply: async (leaveData) => {
    const response = await api.post('/leaves', leaveData);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/leaves/${id}/status`, { status });
    return response.data;
  },
};

export const documentsAPI = {
  list: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/documents`);
    return response.data;
  },
  upload: async (employeeId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/employees/${employeeId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  downloadUrl: (filePath) => {
    return `http://localhost:8000${filePath}`;
  },
};

export const noticesAPI = {
  list: async () => {
    const response = await api.get('/notices');
    return response.data;
  },
  create: async (noticeData) => {
    const response = await api.post('/notices', noticeData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/notices/${id}`);
    return response.data;
  },
};

export const notificationsAPI = {
  list: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  read: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
};

export const expensesAPI = {
  list: async () => {
    const response = await api.get('/expenses');
    return response.data;
  },
  create: async (amount, category, description, file = null) => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    const response = await api.post('/expenses', formData, {
      params: { amount, category, description },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/expenses/${id}/status`, { status });
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
