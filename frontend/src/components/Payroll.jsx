import React, { useEffect, useState } from 'react';
import { CreditCard, FileSpreadsheet, FileText, CheckCircle2, DollarSign, Search, Clock } from 'lucide-react';
import { employeeAPI, attendanceAPI, reportsAPI } from '../api';

export default function Payroll({ user }) {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isApprover = ['Super Admin', 'HR', 'Manager'].includes(user?.role);

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const empData = await employeeAPI.list();
      setEmployees(empData);

      const attData = await attendanceAPI.history();
      setAttendance(attData);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch corporate payroll ledger records.');
    } finally {
      setLoading(false);
    }
  };

  const getOtHours = (empId) => {
    return attendance
      .filter(a => a.employee_id === empId)
      .reduce((sum, current) => sum + (current.overtime_hours || 0), 0);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const calculateTotalPayroll = () => {
    return employees.reduce((acc, emp) => {
      const otHours = getOtHours(emp.id);
      const otPay = otHours * 25.0;
      return acc + emp.base_salary + emp.bonus + otPay;
    }, 0);
  };

  // Filter list
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const position = emp.position.toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || position.includes(query);
  });

  // Employee Self Paystub detail view
  if (!isApprover) {
    const myRoster = employees.find(e => e.id === user?.employee_id);
    if (!myRoster) {
      return (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-6 rounded-2xl font-medium text-sm">
          ⚠️ Your user account is not mapped to an active employee profile. Please contact HR to review your payroll configuration.
        </div>
      );
    }

    const otHours = getOtHours(myRoster.id);
    const otPay = otHours * 25.0;
    const grossSalary = myRoster.base_salary + myRoster.bonus + otPay;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Salary Statement</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">View your personalized salary paystub details and hourly breakdown.</p>
        </div>

        <div className="max-w-md bg-white rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden">
          {/* Paystub Header */}
          <div className="bg-indigo-600 text-white p-6 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">Official Statement</span>
              <span className="text-xl font-extrabold block">{myRoster.first_name} {myRoster.last_name}</span>
              <span className="text-xs text-indigo-100 font-semibold block mt-0.5">{myRoster.position}</span>
            </div>
            <CreditCard className="w-10 h-10 text-indigo-200" />
          </div>

          {/* Paystub Details */}
          <div className="p-6 space-y-4 text-xs font-semibold text-slate-600">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Base Monthly Salary:</span>
              <span className="text-slate-900 font-bold">{formatCurrency(myRoster.base_salary)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Performance Bonus:</span>
              <span className="text-slate-900 font-bold">{formatCurrency(myRoster.bonus)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Overtime Hours Worked:</span>
              <span className="text-slate-900 font-bold">{otHours.toFixed(2)} hrs</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Overtime Pay ($25.00 / hr):</span>
              <span className="text-slate-900 font-bold">{formatCurrency(otPay)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t-2 border-dashed border-slate-200 text-sm font-extrabold text-indigo-600">
              <span>Gross Payout (USD):</span>
              <span className="text-slate-950 text-base">{formatCurrency(grossSalary)}</span>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Corporate Paycard</span>
            <span className="text-emerald-600">Active</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payroll Ledger</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Automated payroll calculation, salary statements, and compliance audits.</p>
        </div>
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
      </div>

      {/* Aggregate Metrics */}
      {!loading && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Monthly Liability (incl. OT)</span>
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

      {/* Roster Search */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm max-w-sm">
        <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search payroll records..."
          className="w-full text-xs text-slate-950 font-medium placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Roster list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-medium">
          {error}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-2xl border border-slate-200/60 shadow-sm text-slate-400 font-medium text-sm">
          No payroll records matching your query.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4.5">Employee</th>
                  <th className="px-6 py-4.5">Position</th>
                  <th className="px-6 py-4.5">Base Salary</th>
                  <th className="px-6 py-4.5">Bonus</th>
                  <th className="px-6 py-4.5">Overtime hours</th>
                  <th className="px-6 py-4.5">Overtime Pay</th>
                  <th className="px-6 py-4.5 text-right">Total Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                {filteredEmployees.map((emp) => {
                  const otHours = getOtHours(emp.id);
                  const otPay = otHours * 25.0;
                  const totalSal = emp.base_salary + emp.bonus + otPay;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-950">
                        {emp.first_name} {emp.last_name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{emp.position}</td>
                      <td className="px-6 py-4">{formatCurrency(emp.base_salary)}</td>
                      <td className="px-6 py-4">{formatCurrency(emp.bonus)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{otHours.toFixed(2)} hrs</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{formatCurrency(otPay)}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-indigo-600 text-sm">
                        {formatCurrency(totalSal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
