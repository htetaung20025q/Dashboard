import React, { useState } from 'react';
import { Building2, Lock, User, Eye, EyeOff, AlertCircle, Mail, Briefcase, Check } from 'lucide-react';
import { authAPI } from '../api';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration Form States
  const [regData, setRegData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    username: '',
    password: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Authenticate and get JWT token (sets HTTPOnly cookie automatically)
      const data = await authAPI.login(username, password);
      localStorage.setItem('token', data.access_token);
      
      // 2. Fetch logged-in user profile details
      const userProfile = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(userProfile));

      // 3. Callback to update global auth status
      onLoginSuccess(userProfile);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Unable to connect to the server. Please verify your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const { first_name, last_name, email, position, username, password } = regData;
    if (!first_name || !last_name || !email || !position || !username || !password) {
      setError('Please fill out all registration fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Register employee profile
      await authAPI.register(regData);

      // 2. Automatically log in the newly registered user
      const data = await authAPI.login(username, password);
      localStorage.setItem('token', data.access_token);
      
      const userProfile = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(userProfile));

      onLoginSuccess(userProfile);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Failed to register account. Check for duplicate email/username.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3.5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {isRegister ? 'Employee Registration' : 'Welcome Back'}
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          {isRegister 
            ? 'Sign up to create your profile and access the timecard system.' 
            : 'Sign in to access your company dashboard and timesheet.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 sm:rounded-3xl border border-slate-100 sm:px-10">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl mb-6 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* SIGN IN VIEW */}
          {!isRegister ? (
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-950 font-medium transition-all duration-200"
                    placeholder=""
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-950 font-medium transition-all duration-200"
                    placeholder=""
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          ) : (
            /* REGISTRATION VIEW */
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={regData.first_name}
                    onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={regData.last_name}
                    onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Corporate Position *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regData.position}
                    onChange={(e) => setRegData({ ...regData, position: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Username *</label>
                  <input
                    type="text"
                    required
                    value={regData.username}
                    onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Password *</label>
                  <input
                    type="password"
                    required
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Register Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Form Switch Link */}
          <div className="text-center mt-5 text-sm font-medium">
            {isRegister ? (
              <span className="text-slate-500">
                Already have an account?{' '}
                <button 
                  onClick={() => { setIsRegister(false); setError(''); }}
                  className="text-indigo-600 hover:underline focus:outline-none"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span className="text-slate-500">
                New employee?{' '}
                <button 
                  onClick={() => { setIsRegister(true); setError(''); }}
                  className="text-indigo-600 hover:underline focus:outline-none"
                >
                  Register Profile
                </button>
              </span>
            )}
          </div>

          {/* Seed Credentials Hint Card */}
          {!isRegister && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Default Demonstration Accounts
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div 
                  onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  title="Click to auto-fill Admin login"
                >
                  <span className="font-semibold text-slate-700 block">Admin Role</span>
                  <span className="text-slate-500 block">User: <code className="text-[10px] bg-slate-200/50">admin</code></span>
                  <span className="text-slate-500 block">Pass: <code className="text-[10px] bg-slate-200/50">admin123</code></span>
                </div>
                <div 
                  onClick={() => { setUsername('htet.aung'); setPassword('employee123'); }}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  title="Click to auto-fill Employee login"
                >
                  <span className="font-semibold text-slate-700 block">Employee Role</span>
                  <span className="text-slate-500 block">User: <code className="text-[10px] bg-slate-200/50">htet.aung</code></span>
                  <span className="text-slate-500 block">Pass: <code className="text-[10px] bg-slate-200/50">employee123</code></span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium text-center mt-3.5">
                💡 Usernames are automatically generated as <strong className="font-bold">firstname.lastname</strong> (lowercase) upon employee registration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
