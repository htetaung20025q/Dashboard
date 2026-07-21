import React, { useEffect, useState } from 'react';
import { Clock, Play, Square, Calendar, UserCheck, AlertCircle } from 'lucide-react';
import { attendanceAPI } from '../api';

export default function Attendance({ user }) {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const isEmployee = user?.role === 'Employee';

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError('');
      if (isEmployee) {
        // Employees fetch their daily status and personal logs
        const statusData = await attendanceAPI.status();
        setStatus(statusData);
      }
      const historyData = await attendanceAPI.history();
      setHistory(historyData);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Unable to load attendance parameters. Ensure your profile is mapped to an employee record.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      await attendanceAPI.checkIn();
      await fetchAttendanceData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to record check-in timestamp.');
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
      alert(err.response?.data?.detail || 'Failed to record check-out timestamp.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (val) => {
    if (!val) return '-';
    return new Date(val).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const calculateHours = (inStr, outStr) => {
    if (!inStr || !outStr) return '-';
    const duration = new Date(outStr) - new Date(inStr);
    const hours = duration / (1000 * 60 * 60);
    return `${hours.toFixed(2)} hrs`;
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Timecards & Logs</h2>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Track active shift attendance and view company check-in history.</p>
      </div>

      {/* Interactive Check-In Control Panel (Employees Only) */}
      {isEmployee && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">Daily Shift Console</h3>
              <p className="text-xs text-slate-400 font-medium">Record check-in and out timestamps for compliance.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && status && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Live Info Widget */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Today's Timeline
                </span>
                <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                  <div className="flex justify-between">
                    <span>Check-In:</span>
                    <span className="text-slate-900">{formatDateTime(status.last_check_in)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-Out:</span>
                    <span className="text-slate-900">{formatDateTime(status.last_check_out)}</span>
                  </div>
                </div>
              </div>

              {/* Status Display Card */}
              <div className="text-center md:text-left">
                <span className="text-xs text-slate-400 font-bold block mb-1">Duty Status</span>
                {status.is_checked_in ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-full">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    Currently On-Duty
                  </span>
                ) : status.last_check_in ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200/50 text-xs font-bold rounded-full">
                    Shift Ended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold rounded-full">
                    Not Checked-In Today
                  </span>
                )}
              </div>

              {/* Operations Control Button */}
              <div className="flex justify-center md:justify-end">
                {status.is_checked_in ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-rose-100 disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Check Out Shift
                  </button>
                ) : (
                  <button
                    onClick={handleCheckIn}
                    disabled={status.last_check_in !== null || actionLoading}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Check In Shift
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Ledger List */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h3 className="font-extrabold text-slate-900">Attendance Log</h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">Showing last 100 logs</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">
            No attendance history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Clock In</th>
                  <th className="px-6 py-4">Clock Out</th>
                  <th className="px-6 py-4">Total Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/50 transition-colors duration-150 text-slate-900 font-medium">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold uppercase">
                          {att.employee_name ? att.employee_name.substring(0, 2) : 'EM'}
                        </div>
                        <span className="font-semibold text-slate-950">
                          {att.employee_name || 'System Employee'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(att.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-semibold">{formatDateTime(att.check_in)}</td>
                    <td className="px-6 py-4 text-slate-600 font-semibold">{formatDateTime(att.check_out)}</td>
                    <td className="px-6 py-4">
                      {att.check_out ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          {calculateHours(att.check_in, att.check_out)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                          Active Shift
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
