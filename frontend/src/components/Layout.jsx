import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  DollarSign, 
  Briefcase, 
  LogOut, 
  Menu, 
  X, 
  Building2, 
  Shield 
} from 'lucide-react';

export default function Layout({ children, activeTab, setActiveTab, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { id: 'employees', name: 'Employees', icon: Users, adminOnly: false },
    { id: 'attendance', name: 'Attendance', icon: Clock, adminOnly: false },
    { id: 'payroll', name: 'Payroll', icon: Briefcase, adminOnly: false },
    { id: 'finance', name: 'Financials', icon: DollarSign, adminOnly: true },
  ];

  // Filter menu based on user role
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || user?.role === 'Admin');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white border-r border-slate-200">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-none">CorpManager</h1>
            <span className="text-xs text-slate-500 font-medium">Operations Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 m-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
              {user?.username?.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.username}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 font-medium capitalize">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex w-full max-w-xs flex-col bg-white h-full p-6 shadow-2xl transition-transform duration-300 transform translate-x-0">
            <div className="absolute top-5 right-5">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-100">
              <Building2 className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="font-bold text-slate-900 leading-none">CorpManager</h1>
                <span className="text-xs text-slate-500 font-medium">Operations Portal</span>
              </div>
            </div>

            <nav className="flex-1 space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                  {user?.username?.substring(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user?.username}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 md:px-8 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 flex justify-end items-center gap-4">
            <span className="text-xs text-slate-400 font-medium">
              System Time: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                System Online
              </span>
            </div>
          </div>
        </header>

        {/* Content Shell */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
