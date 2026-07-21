import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Briefcase, DollarSign, X, Check, Search } from 'lucide-react';
import { employeeAPI } from '../api';

export default function Employees({ user }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal forms states
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState(null); // null for new employee, employee object for editing
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    base_salary: '',
    bonus: ''
  });
  const [formError, setFormError] = useState('');

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeAPI.list();
      setEmployees(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch employee directory');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (emp = null) => {
    if (emp) {
      setCurrentEmp(emp);
      setFormData({
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        position: emp.position,
        base_salary: emp.base_salary.toString(),
        bonus: emp.bonus.toString()
      });
    } else {
      setCurrentEmp(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        position: '',
        base_salary: '',
        bonus: ''
      });
    }
    setFormError('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.position) {
      setFormError('Please fill out all required fields');
      return;
    }

    const payload = {
      ...formData,
      base_salary: parseFloat(formData.base_salary) || 0.0,
      bonus: parseFloat(formData.bonus) || 0.0
    };

    try {
      if (currentEmp) {
        // Edit mode
        await employeeAPI.update(currentEmp.id, payload);
      } else {
        // Create mode
        await employeeAPI.create(payload);
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Error saving employee data. Check for email duplicates.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee and delete their corresponding user credentials?')) return;
    try {
      await employeeAPI.delete(id);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      alert('Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const email = emp.email.toLowerCase();
    const position = emp.position.toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || email.includes(query) || position.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Staff & Directory</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Manage employee roles, salaries, and system login credentials.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      {/* Directory Search & Filter */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-sm max-w-md">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, position..."
          className="w-full text-sm text-slate-950 font-medium placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Main Directory Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-medium">
          {error}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-2xl border border-slate-200/60 shadow-sm text-slate-400 font-medium">
          No employees found matching the search criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Email</th>
                  {isAdmin && <th className="px-6 py-4">Base Salary</th>}
                  {isAdmin && <th className="px-6 py-4">Bonus</th>}
                  {isAdmin && <th className="px-6 py-4">Total Salary</th>}
                  {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors duration-150 text-slate-900 font-medium">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold uppercase">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-950 block">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-xs text-slate-400">ID: #{emp.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{emp.position}</td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {emp.email}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 font-semibold">${emp.base_salary.toLocaleString()}</td>
                    )}
                    {isAdmin && (
                      <td className="px-6 py-4 text-slate-500">${emp.bonus.toLocaleString()}</td>
                    )}
                    {isAdmin && (
                      <td className="px-6 py-4 text-indigo-600 font-bold">
                        ${(emp.base_salary + emp.bonus).toLocaleString()}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(emp)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-150"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-150"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal Drawer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-950">
                {currentEmp ? 'Modify Profile' : 'Register New Employee'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Corporate Position *</label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Frontend Engineer"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Base Salary ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Monthly Bonus ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              {!currentEmp && (
                <div className="p-3 bg-indigo-50/50 text-indigo-800 text-[11px] leading-relaxed rounded-xl border border-indigo-100">
                  <span className="font-bold block mb-0.5">ℹ️ Auto-Provisioning Account Credentials</span>
                  Creating this employee profile automatically creates an app user. 
                  Username: <strong className="font-extrabold font-mono">firstname.lastname</strong>, Password: <strong className="font-extrabold font-mono">employee123</strong>
                </div>
              )}

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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
