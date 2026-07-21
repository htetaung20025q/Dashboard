import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Megaphone, X, Trash2 } from 'lucide-react';
import { noticesAPI } from '../api';

export default function Notices({ user }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Post form state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const isApprover = ['Super Admin', 'HR', 'Manager'].includes(user?.role);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await noticesAPI.list();
      setNotices(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch corporate announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      setFormError('Please fill out all fields');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await noticesAPI.create({ title, content });
      setModalOpen(false);
      setTitle('');
      setContent('');
      fetchNotices();
    } catch (err) {
      console.error(err);
      setFormError('Failed to publish notice announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Are you sure you want to remove this announcement notice?')) return;
    try {
      await noticesAPI.delete(id);
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('Failed to delete announcement notice.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Announcements</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Stay updated with company-wide notices, policies, and newsletters.</p>
        </div>
        {isApprover && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Post Announcement
          </button>
        )}
      </div>

      {/* Notices Feed List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-medium text-sm">
          {error}
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-2xl border border-slate-200/60 shadow-sm text-slate-400 font-medium text-sm">
          No notices posted on the board yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notices.map((n) => (
            <div key={n.id} className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 px-2.5 py-1 bg-indigo-50 rounded-full">
                    <Megaphone className="w-3.5 h-3.5" />
                    Notice
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight tracking-tight">
                  {n.title}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                  {n.content}
                </p>
              </div>

              {/* Publisher User Metadata */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold uppercase text-[9px]">
                    {n.creator_name?.substring(0, 2)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Posted by <span className="text-slate-700 font-extrabold">{n.creator_name}</span>
                  </div>
                </div>
                {isApprover && (
                  <button
                    onClick={() => handleDeleteNotice(n.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post notice modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-950">Publish Announcement</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg">
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

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  placeholder="e.g. Health Insurance policy revisions"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Message Content *</label>
                <textarea
                  rows="5"
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  placeholder="Write details of announcement..."
                ></textarea>
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
                  {submitting ? 'Publishing...' : 'Publish Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
