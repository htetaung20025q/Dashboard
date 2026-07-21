import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  DollarSign, 
  Tag, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  Upload, 
  ExternalLink 
} from 'lucide-react';
import { expensesAPI, documentsAPI } from '../api';

export default function Expenses({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Submit form states
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Travel');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const isEmployee = user?.role === 'Employee';
  const isApprover = ['Super Admin', 'HR', 'Manager'].includes(user?.role);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await expensesAPI.list();
      setExpenses(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch expense reimbursement records');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !description) {
      setFormError('Please provide a positive amount and description.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await expensesAPI.create(parseFloat(amount), category, description, file);
      setModalOpen(false);
      setAmount('');
      setCategory('Travel');
      setDescription('');
      setFile(null);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      setFormError('Failed to submit reimbursement claim.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, statusVal) => {
    if (!window.confirm(`Are you sure you want to ${statusVal.toLowerCase()} this expense claim?`)) return;
    try {
      await expensesAPI.updateStatus(id, statusVal);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Failed to update expense status.');
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
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expense Claims</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Submit corporate expenses, upload receipt invoices, and audit approvals.</p>
        </div>
        {isEmployee && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            File Reimbursement
          </button>
        )}
      </div>

      {/* Expense ledger list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-medium text-sm">
          {error}
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-2xl border border-slate-200/60 shadow-sm text-slate-400 font-medium text-sm">
          No expense reimbursement requests logged.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isApprover && <th className="px-6 py-4">Employee</th>}
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Receipt</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  {isApprover && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                {expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/50 transition-colors">
                    {isApprover && <td className="px-6 py-4 font-bold text-slate-950">{ex.employee_name}</td>}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded-full">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {ex.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={ex.description}>
                      {ex.description}
                    </td>
                    <td className="px-6 py-4">
                      {ex.receipt_path ? (
                        <a
                          href={documentsAPI.downloadUrl(ex.receipt_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Receipt
                        </a>
                      ) : (
                        <span className="text-slate-300">No Attachment</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(ex.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        ex.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                        ex.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {ex.status}
                      </span>
                    </td>
                    {isApprover && (
                      <td className="px-6 py-4 text-right">
                        {ex.status === 'Pending' && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(ex.id, 'Approved')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Approve Claim"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(ex.id, 'Rejected')}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Reject Claim"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reimbursement submission Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-950">File Expense Claim</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Amount ($) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                >
                  <option value="Travel">Travel</option>
                  <option value="Meals">Meals</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description *</label>
                <textarea
                  rows="3"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Attach Receipt Image/PDF</label>
                <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="flex text-xs text-slate-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-semibold text-indigo-600 hover:text-indigo-50">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          onChange={(e) => setFile(e.target.files[0])}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    {file && <p className="text-[10px] text-indigo-600 font-bold">{file.name}</p>}
                  </div>
                </div>
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
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
