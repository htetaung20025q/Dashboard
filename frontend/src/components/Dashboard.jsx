import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileSpreadsheet, 
  FileText,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { financeAPI, reportsAPI } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await financeAPI.stats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-medium">
        {error || 'No financial records loaded.'}
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Pie chart colors
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#94a3b8'];

  return (
    <div className="space-y-8">
      {/* Header section with reports actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Financial Analytics</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Real-time revenue, margins, and operational metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={reportsAPI.exportCSV('finance')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all duration-200 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </a>
          <a
            href={reportsAPI.exportPDF('finance')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </div>

      {/* Financial Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Income */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Income</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(stats.total_income)}
            </h3>
            <div className="flex items-center gap-1 mt-2">
              {stats.income_change >= 0 ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{stats.income_change}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {stats.income_change}%
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium">vs last month</span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(stats.total_expenses)}
            </h3>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-slate-500 font-medium">Outgoings & Reimbursements</span>
            </div>
          </div>
        </div>

        {/* Net Profit & MoM Growth */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Net Profit</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(stats.net_profit)}
            </h3>
            <div className="flex items-center gap-3.5 mt-2">
              <div className="flex items-center gap-1">
                {stats.mom_growth_rate >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{stats.mom_growth_rate}% MoM
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {stats.mom_growth_rate}% MoM
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                Margin: <span className="text-indigo-600 font-bold">{stats.profit_margin}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Cashflow History</h3>
            <p className="text-xs text-slate-400 font-medium">Income and expenses over the last 6 months.</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} 
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Expense Divisions</h3>
            <p className="text-xs text-slate-400 font-medium">Breakdown of operational spend by category.</p>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            {stats.category_distribution && stats.category_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.category_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400 font-medium">No expenses logged yet.</span>
            )}
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 max-h-24 overflow-y-auto pt-2 border-t border-slate-100">
            {stats.category_distribution && stats.category_distribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{entry.name}</span>
                <span className="text-slate-400 font-bold ml-auto">${Math.round(entry.value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
