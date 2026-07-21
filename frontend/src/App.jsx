import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Attendance from './components/Attendance';
import Finance from './components/Finance';
import Payroll from './components/Payroll';
import Expenses from './components/Expenses';
import Notices from './components/Notices';
import { authAPI } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authChecking, setAuthChecking] = useState(true);

  // Check auth credentials on startup / token change
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const profile = await authAPI.getMe();
          setUser(profile);
          // Set default landing tab: Employees for employee role, Dashboard for Admin
          const isApprover = ['Super Admin', 'HR', 'Manager'].includes(profile.role);
          setActiveTab(isApprover ? 'dashboard' : 'attendance');
        } catch (err) {
          console.error('Session validation failed:', err);
          // Reset token & states
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthChecking(false);
    };

    verifyAuth();
  }, [token]);

  const handleLoginSuccess = (userProfile) => {
    setToken(localStorage.getItem('token'));
    setUser(userProfile);
    const isApprover = ['Super Admin', 'HR', 'Manager'].includes(userProfile.role);
    setActiveTab(isApprover ? 'dashboard' : 'attendance');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Failed to trigger backend logout:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="text-sm font-semibold text-slate-500">Initializing Portal...</span>
        </div>
      </div>
    );
  }

  // Render auth login wrapper if not logged in
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Active module page selector
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <Employees user={user} />;
      case 'attendance':
        return <Attendance user={user} />;
      case 'finance':
        return <Finance />;
      case 'payroll':
        return <Payroll user={user} />;
      case 'expenses':
        return <Expenses user={user} />;
      case 'notices':
        return <Notices user={user} />;
      default:
        return ['Super Admin', 'HR', 'Manager'].includes(user?.role) ? <Dashboard /> : <Attendance user={user} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}
