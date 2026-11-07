import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Save, ShieldCheck, UserCheck } from 'lucide-react';
import userApi from '../../api/userApi';

const ROLE_OPTIONS = [
  { value: 'MAINTENANCE_ADMIN', label: 'Maintenance Admin (Full System & RBAC Governance)' },
  { value: 'OPERATIONS_MANAGER', label: 'Operations Manager (Fleet Approvals & Reports Export)' },
  { value: 'TECHNICIAN', label: 'Field Technician (Work Queue Execution & Evidence Upload)' },
  { value: 'VENDOR', label: 'Equipment Vendor (Assigned Chiller & BMC Servicing)' }
];

export const UserFormModal = ({ isOpen, onClose, onUserSaved, userToEdit = null }) => {
  const isEditMode = Boolean(userToEdit);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'TECHNICIAN',
    phone: '+91 98450 00000',
    cooperativeZone: 'Southern District Union',
    assignedPlant: 'Plant-Central (Mysore)',
    assignedCenter: 'VCC-MYSORE-01',
    accountStatus: 'ACTIVE'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        fullName: userToEdit.fullName || '',
        email: userToEdit.email || '',
        password: '',
        role: userToEdit.role || 'TECHNICIAN',
        phone: userToEdit.phone || '+91 98450 00000',
        cooperativeZone: userToEdit.orgScope?.cooperativeZone || 'Southern District Union',
        assignedPlant: userToEdit.orgScope?.assignedPlants?.[0] || 'Plant-Central (Mysore)',
        assignedCenter: userToEdit.orgScope?.assignedCenters?.[0] || 'VCC-MYSORE-01',
        accountStatus: userToEdit.accountStatus || 'ACTIVE'
      });
    } else {
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'TECHNICIAN',
        phone: '+91 98450 00000',
        cooperativeZone: 'Southern District Union',
        assignedPlant: 'Plant-Central (Mysore)',
        assignedCenter: 'VCC-MYSORE-01',
        accountStatus: 'ACTIVE'
      });
    }
    setErrors({});
    setServerError('');
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!isEditMode && !formData.email.trim()) {
      newErrors.email = 'Email address is required';
    }
    if (!isEditMode && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    const payload = {
      fullName: formData.fullName.trim(),
      role: formData.role,
      phone: formData.phone.trim(),
      orgScope: {
        cooperativeZone: formData.cooperativeZone,
        assignedPlants: [formData.assignedPlant],
        assignedCenters: [formData.assignedCenter]
      },
      accountStatus: formData.accountStatus
    };

    if (!isEditMode) {
      payload.email = formData.email.toLowerCase().trim();
      payload.password = formData.password;
    }

    try {
      if (isEditMode) {
        const res = await userApi.updateUser(userToEdit._id, payload);
        onUserSaved(res.data);
      } else {
        const res = await userApi.createUser(payload);
        onUserSaved(res.data);
      }
      onClose();
    } catch (err) {
      console.error('User save failed:', err);
      setServerError(err.response?.data?.message || err.message || 'Failed to save cooperative user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 to-sky-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              {isEditMode ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEditMode ? 'Edit Cooperative User Account' : 'Provision Cooperative User Account'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditMode
                  ? 'Update RBAC role, contact, and assigned organizational access scope'
                  : 'Assign RBAC security roles and organizational scope access using least-privilege defaults'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {serverError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Ramesh Gowda"
              className={`w-full px-3.5 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                errors.fullName ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.fullName && <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cooperative Email {!isEditMode && <span className="text-red-500">*</span>}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isEditMode}
                placeholder="user@dairycoop.org"
                className={`w-full px-3.5 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-300'
                }`}
              />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            {!isEditMode ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className={`w-full px-3.5 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    errors.password ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  name="accountStatus"
                  value={formData.accountStatus}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            )}
          </div>

          {/* Role & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned RBAC Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98450 00000"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Organizational Scope Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Cooperative Organizational Scope (Least-Privilege Routing)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cooperative Zone</label>
                <select
                  name="cooperativeZone"
                  value={formData.cooperativeZone}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">ALL (Entire Cooperative)</option>
                  <option value="Southern District Union">Southern District Union</option>
                  <option value="Mysore District Union">Mysore District Union</option>
                  <option value="Mandya Chilling Zone">Mandya Chilling Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assigned Plant</label>
                <input
                  type="text"
                  name="assignedPlant"
                  value={formData.assignedPlant}
                  onChange={handleChange}
                  placeholder="e.g. Plant-Central (Mysore)"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assigned Center</label>
                <input
                  type="text"
                  name="assignedCenter"
                  value={formData.assignedCenter}
                  onChange={handleChange}
                  placeholder="e.g. VCC-MYSORE-01"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : isEditMode ? 'Update User Account' : 'Provision User Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
