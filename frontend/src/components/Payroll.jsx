import React, { useEffect, useState } from 'react';
import { CreditCard, FileSpreadsheet, FileText, CheckCircle2, DollarSign, Search, Edit2 } from 'lucide-react';
import { employeeAPI, reportsAPI } from '../api';

export default function Payroll({ user }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await employeeAPI.list();
      setEmployees(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch corporate payroll sheets');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPayroll = () => {
    return employees.reduce((acc, emp) => acc + emp.base_salary + emp.bonus, 0);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const position = emp.position.toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || position.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payroll Ledger</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Automated payroll calculation, salary statements, and compliance audits.</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <a
              href={reportsAPI.exportCSV('payroll')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all duration-200 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export CSV
            </a>
            <a
              href={reportsAPI.exportPDF('payroll')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
            >
              <FileText className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        )}
      </div>

      {/* Aggregate metrics for payroll */}
      {!loading && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Monthly Liability</span>
              <span className="text-2xl font-extrabold text-slate-950 block">{formatCurrency(calculateTotalPayroll())}</span>
            </div>
            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Count</span>
              <span className="text-2xl font-extrabold text-slate-950 block">{employees.length} Active Employees</span>
            </div>
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
        </div>
      )}

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm max-w-sm">
        <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by name, position..."
          className="w-full text-xs text-slate-950 font-medium placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Payroll Data Table */}
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
          No records matching filter criteria.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Employee Name</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Base Salary</th>
                  <th className="px-6 py-4">Bonus</th>
                  <th className="px-6 py-4">Total Salary (Base + Bonus)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors duration-150 text-slate-900 font-medium">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold uppercase text-xs">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <span className="font-semibold text-slate-950">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">{emp.position}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono font-semibold">
                      {formatCurrency(emp.base_salary)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {formatCurrency(emp.bonus)}
                    </td>
                    <td className="px-6 py-4 text-indigo-600 font-mono font-bold">
                      {formatCurrency(emp.base_salary + emp.bonus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
