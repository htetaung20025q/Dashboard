import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  Calendar, 
  UserCheck, 
  AlertCircle, 
  Check, 
  X, 
  FileText, 
  Plus, 
  HelpCircle 
} from 'lucide-react';
import { attendanceAPI, leavesAPI } from '../api';

export default function Attendance({ user }) {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Leave Form state
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Casual',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [leaveError, setLeaveError] = useState('');

  const isEmployee = user?.role === 'Employee';
  const isApprover = ['Super Admin', 'HR', 'Manager'].includes(user?.role);

  useEffect(() => {
    fetchAttendanceData();
    fetchLeaveData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError('');
      if (isEmployee) {
        const statusData = await attendanceAPI.status();
        setStatus(statusData);
      }
      const historyData = await attendanceAPI.history();
      setHistory(historyData);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Unable to load attendance details. Check profile mappings.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveData = async () => {
    try {
      const leaveData = await leavesAPI.list();
      setLeaves(leaveData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      await attendanceAPI.checkIn();
      await fetchAttendanceData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      await attendanceAPI.checkOut();
      await fetchAttendanceData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to check-out.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date) {
      setLeaveError('Please select both start and end dates');
      return;
    }
    try {
      setLeaveError('');
      await leavesAPI.apply(leaveForm);
      setLeaveModal(false);
      setLeaveForm({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
      fetchLeaveData();
    } catch (err) {
      console.error(err);
      setLeaveError(err.response?.data?.detail || 'Failed to submit leave request');
    }
  };

  const handleUpdateLeaveStatus = async (id, statusVal) => {
    if (!window.confirm(`Are you sure you want to set this leave status to ${statusVal}?`)) return;
    try {
      await leavesAPI.updateStatus(id, statusVal);
      fetchLeaveData();
    } catch (err) {
      console.error(err);
      alert('Failed to update leave request status');
    }
  };

  const formatDateTime = (val) => {
    if (!val) return '-';
    return new Date(val).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (inStr, outStr) => {
    if (!inStr || !outStr) return '-';
    const duration = new Date(outStr) - new Date(inStr);
    const hours = duration / (1000 * 60 * 60);
    return `${hours.toFixed(2)} hrs`;
  };

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Attendance & Leaves</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Manage clock-in/out schedules, leave records, and overtime rates.</p>
        </div>
        {isEmployee && (
          <button
            onClick={() => setLeaveModal(true)}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Apply Leave
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Shift Console (Employee only) */}
        {isEmployee && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6 lg:col-span-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">Shift Console</h3>
                  <p className="text-xs text-slate-400 font-medium">Record clock-in and out timestamps.</p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Status display */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-600 space-y-2">
                <div className="flex justify-between">
                  <span>Current Shift Status:</span>
                  <span className={status?.is_checked_in ? 'text-indigo-600 font-bold' : 'text-slate-400'}>
                    {status?.is_checked_in ? '🔴 Checked In' : '⚪ Off-Duty'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clock-In Time:</span>
                  <span>{formatDateTime(status?.last_check_in)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clock-Out Time:</span>
                  <span>{formatDateTime(status?.last_check_out)}</span>
                </div>
                {status?.overtime_hours > 0 && (
                  <div className="flex justify-between text-indigo-600 font-bold border-t border-slate-200/60 pt-2">
                    <span>Overtime Accrued:</span>
                    <span>{status.overtime_hours} hrs</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleCheckIn}
                disabled={actionLoading || status?.is_checked_in}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-lg shadow-indigo-100"
              >
                <Play className="w-4 h-4" />
                Clock In
              </button>
              <button
                onClick={handleCheckOut}
                disabled={actionLoading || !status?.is_checked_in}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors"
              >
                <Square className="w-4 h-4" />
                Clock Out
              </button>
            </div>
          </div>
        )}

        {/* Leave Requests Logs Ledger */}
        <div className={`bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4 ${isEmployee ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Leave Register</h3>
            <p className="text-xs text-slate-400 font-medium">Leave logs and approval records.</p>
          </div>

          {leaves.length === 0 ? (
            <p className="text-center text-xs text-slate-400 font-semibold py-8 bg-slate-50 rounded-2xl">No leave requests logged.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {isApprover && <th className="px-4 py-3">Employee</th>}
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Date Range</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    {isApprover && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      {isApprover && <td className="px-4 py-3 font-bold text-slate-950">{l.employee_name}</td>}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          l.leave_type === 'Casual' ? 'bg-blue-50 text-blue-700' :
                          l.leave_type === 'Medical' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {l.leave_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{l.start_date} to {l.end_date}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium max-w-[150px] truncate" title={l.reason}>
                        {l.reason || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                          l.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      {isApprover && (
                        <td className="px-4 py-3 text-right">
                          {l.status === 'Pending' && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateLeaveStatus(l.id, 'Approved')}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="Approve Leave"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateLeaveStatus(l.id, 'Rejected')}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Reject Leave"
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
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Timesheet History</h3>
          <p className="text-xs text-slate-400 font-medium">Log entries of past clock-in metrics.</p>
        </div>

        {history.length === 0 ? (
          <p className="text-center text-xs text-slate-400 font-semibold py-8 bg-slate-50 rounded-2xl">No history found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Shift Date</th>
                  <th className="px-6 py-3.5">Clock In</th>
                  <th className="px-6 py-3.5">Clock Out</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Overtime hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                {history.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-950">{att.employee_name}</td>
                    <td className="px-6 py-4 text-slate-500">{att.date}</td>
                    <td className="px-6 py-4">{formatDateTime(att.check_in)}</td>
                    <td className="px-6 py-4">{formatDateTime(att.check_out)}</td>
                    <td className="px-6 py-4">{calculateHours(att.check_in, att.check_out)}</td>
                    <td className="px-6 py-4">
                      {att.overtime_hours > 0 ? (
                        <span className="text-indigo-600 font-bold">+{att.overtime_hours} hrs</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-950">File Leave Request</h3>
              <button onClick={() => setLeaveModal(false)} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              {leaveError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {leaveError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Medical">Medical Leave</option>
                  <option value="Annual">Annual Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reason / Comments</label>
                <textarea
                  rows="3"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
