import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Attendance from './components/Attendance';
import Finance from './components/Finance';
import Payroll from './components/Payroll';
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
          setActiveTab(profile.role === 'Admin' ? 'dashboard' : 'attendance');
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
    setActiveTab(userProfile.role === 'Admin' ? 'dashboard' : 'attendance');
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
        return user.role === 'Admin' ? <Dashboard /> : <Attendance user={user} />;
      case 'employees':
        return <Employees user={user} />;
      case 'attendance':
        return <Attendance user={user} />;
      case 'finance':
        return user.role === 'Admin' ? <Finance /> : <Employees user={user} />;
      case 'payroll':
        return <Payroll user={user} />;
      default:
        return user.role === 'Admin' ? <Dashboard /> : <Attendance user={user} />;
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
