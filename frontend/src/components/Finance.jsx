import React, { useEffect, useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, Tag, Check, X, Trash2 } from 'lucide-react';
import { financeAPI } from '../api';

export default function Finance() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: 'Sales',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [formError, setFormError] = useState('');

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this financial record?')) return;
    try {
      await financeAPI.delete(id);
      fetchFinancialData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete financial record.');
    }
  };

  const categories = {
    income: ['Sales', 'Consulting', 'Investment', 'Other'],
    expense: ['Payroll', 'Rent', 'Utilities', 'Marketing', 'Software', 'Other']
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError('');
      const listData = await financeAPI.records();
      const statsData = await financeAPI.stats();
      setRecords(listData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch ledger datasets.');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      category: categories[type][0]
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Please input a positive numeric transaction amount');
      return;
    }

    const payload = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    try {
      await financeAPI.create(payload);
      setModalOpen(false);
      // Reset form
      setFormData({
        type: 'income',
        amount: '',
        category: 'Sales',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchFinancialData();
    } catch (err) {
      console.error(err);
      setFormError('Error recording transaction.');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Accounts Ledger</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Register income streams and expense logs.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Mini Stats Banner */}
      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Balance</span>
              <span className="text-xl font-extrabold text-slate-950 mt-1 block">{formatCurrency(stats.net_profit)}</span>
            </div>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.net_profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="w-4.5 h-4.5" />
            </span>
          </div>
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profit Margin</span>
              <span className="text-xl font-extrabold text-indigo-600 mt-1 block">{stats.profit_margin}%</span>
            </div>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              %
            </span>
          </div>
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MoM Scale</span>
              <span className="text-xl font-extrabold text-slate-950 mt-1 block">
                {stats.mom_growth_rate >= 0 ? `+${stats.mom_growth_rate}%` : `${stats.mom_growth_rate}%`}
              </span>
            </div>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.mom_growth_rate >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {stats.mom_growth_rate >= 0 ? <ArrowUpRight className="w-4.5 h-4.5" /> : <ArrowDownRight className="w-4.5 h-4.5" />}
            </span>
          </div>
        </div>
      )}

      {/* Main Ledger Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-medium">
          {error}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-2xl border border-slate-200/60 shadow-sm text-slate-400 font-medium">
          No financial records logged. Click 'Add Transaction' to start.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Accounting Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors duration-150 text-slate-900 font-medium">
                    <td className="px-6 py-4 font-semibold text-slate-950">
                      {r.description || 'General Transaction'}
                    </td>
                    <td className="px-6 py-4">
                      {r.type === 'income' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-full">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Credit / Income
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold rounded-full">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          Debit / Expense
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-slate-500 font-semibold">
                        <Tag className="w-4 h-4 text-slate-400" />
                        {r.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-extrabold ${r.type === 'income' ? 'text-emerald-600' : 'text-slate-950'}`}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-150"
                        title="Delete record"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Transaction Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-950">Add Ledger Log</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Transaction Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Record Classification</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.type === 'income' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.type === 'expense' ? 'bg-white text-rose-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Value ($) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  >
                    {categories[formData.type].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Particulars / Details</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Memo details e.g. AWS Billing"
                  rows="2"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50 resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Post Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
