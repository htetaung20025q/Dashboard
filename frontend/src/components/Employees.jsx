import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Mail, 
  Briefcase, 
  DollarSign, 
  X, 
  Check, 
  Search, 
  Phone, 
  MapPin, 
  UserPlus, 
  FileText, 
  Upload, 
  Download 
} from 'lucide-react';
import { employeeAPI, documentsAPI } from '../api';

export default function Employees({ user }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal forms states
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    base_salary: '',
    bonus: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [formError, setFormError] = useState('');

  // Documents Modal States
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docEmployee, setDocEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);

  const canManage = ['Super Admin', 'HR', 'Manager'].includes(user?.role);
  const canUpload = ['Super Admin', 'HR', 'Manager'].includes(user?.role);

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
        bonus: emp.bonus.toString(),
        phone: emp.phone || '',
        address: emp.address || '',
        emergency_contact_name: emp.emergency_contact_name || '',
        emergency_contact_phone: emp.emergency_contact_phone || ''
      });
    } else {
      setCurrentEmp(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        position: '',
        base_salary: '',
        bonus: '',
        phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
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
        await employeeAPI.update(currentEmp.id, payload);
      } else {
        await employeeAPI.create(payload);
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Error saving employee data. Check for duplicates.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee? This will delete all attendance, leaves, and notifications records.')) return;
    try {
      await employeeAPI.delete(id);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      alert('Failed to delete employee');
    }
  };

  // Documents Handlers
  const handleOpenDocModal = async (emp) => {
    setDocEmployee(emp);
    setDocModalOpen(true);
    setSelectedFile(null);
    try {
      const data = await documentsAPI.list(emp.id);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!selectedFile || !docEmployee) return;

    try {
      setDocUploading(true);
      await documentsAPI.upload(docEmployee.id, selectedFile);
      setSelectedFile(null);
      // Reload documents
      const data = await documentsAPI.list(docEmployee.id);
      setDocuments(data);
    } catch (err) {
      console.error(err);
      alert('Failed to upload document file.');
    } finally {
      setDocUploading(false);
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
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Employee Directory</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Manage directory details, credentials, and attachments.</p>
        </div>
        {canManage && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      {/* Directory Search */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm max-w-sm">
        <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search directory..."
          className="w-full text-xs text-slate-950 font-medium placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Roster Table */}
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
          No records found.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Employee Details</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Contacts</th>
                  <th className="px-6 py-4">Emergency Contact</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEmployees.map((emp) => {
                  const isUserSelf = user?.employee_id === emp.id;
                  const hasEditAccess = canManage || isUserSelf;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors duration-150 text-slate-900 font-medium">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold uppercase text-xs">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <span className="font-bold text-slate-950 block">
                              {emp.first_name} {emp.last_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{emp.address || 'Address unmapped'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 block">{emp.position}</span>
                        {emp.base_salary > 0 && (
                          <span className="text-xs text-indigo-600 font-bold mt-0.5 block">
                            Salary: ${emp.base_salary.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs space-y-1 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {emp.emergency_contact_name ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 block">{emp.emergency_contact_name}</span>
                            <span className="block">{emp.emergency_contact_phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {/* Documents Drawer Button */}
                          <button
                            onClick={() => handleOpenDocModal(emp)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Employee Files & Documents"
                          >
                            <FileText className="w-4.5 h-4.5" />
                          </button>
                          
                          {/* Edit Details */}
                          {hasEditAccess && (
                            <button
                              onClick={() => handleOpenModal(emp)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Edit Employee Details"
                            >
                              <Edit2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                          
                          {/* Delete Roster */}
                          {canManage && (
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Directory Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-950">
                {currentEmp ? 'Edit Employee Details' : 'Register New Employee'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                    disabled={currentEmp && !canManage}
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    disabled={currentEmp && !canManage}
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={currentEmp && !canManage}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Position *</label>
                  <input
                    type="text"
                    required
                    disabled={currentEmp && !canManage}
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              {canManage && (
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
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Bonus ($)</label>
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
              )}

              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide mb-3">Emergency Contact Info</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Contact Phone</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-sm text-slate-900 bg-slate-50/50"
                    />
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

      {/* Documents Attachment Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-950">Documents: {docEmployee?.first_name}</h3>
              <button onClick={() => setDocModalOpen(false)} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Upload Input Section */}
              {canUpload && (
                <form onSubmit={handleUploadDoc} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Upload ID / Contract</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      required
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <button
                      type="submit"
                      disabled={docUploading || !selectedFile}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
                    >
                      <Upload className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </form>
              )}

              {/* Document Lists Table */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Document Vault</span>
                {documents.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 font-semibold py-4">No attachments uploaded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 bg-white hover:bg-slate-50/50 flex justify-between items-center text-xs text-slate-700 font-medium">
                        <div className="truncate pr-4 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="truncate" title={doc.file_name}>{doc.file_name}</span>
                        </div>
                        <a
                          href={documentsAPI.downloadUrl(doc.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
