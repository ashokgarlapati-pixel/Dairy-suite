import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock,
  KeyRound,
  MapPin,
  History,
  Edit,
  Eye,
  Sliders,
  X,
  Laptop,
  Check,
  Clock,
  Layers
} from 'lucide-react';
import userApi from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import UserFormModal from '../components/users/UserFormModal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export const UserManagementPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false);

  // Role Permissions Matrix State
  const [rolePermissions, setRolePermissions] = useState(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await userApi.getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery.trim() || undefined
      });
      if (res?.data?.users) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Unable to retrieve user directory.');
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, statusFilter, searchQuery]);

  const fetchPermissions = async () => {
    try {
      const res = await userApi.getRolePermissions();
      if (res?.data?.roles) {
        setRolePermissions(res.data.roles);
      }
    } catch (err) {
      console.error('Failed to load permissions matrix:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedUserToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (targetUser, e) => {
    if (e) e.stopPropagation();
    setSelectedUserToEdit(targetUser);
    setIsFormModalOpen(true);
  };

  const handleOpenDetails = (targetUser) => {
    setSelectedUserForDetails(targetUser);
  };

  const handleToggleStatus = async (targetUser, e) => {
    if (e) e.stopPropagation();
    const nextStatus = targetUser.accountStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    const confirmMsg = `Are you sure you want to ${nextStatus.toLowerCase()} ${targetUser.fullName}'s account?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await userApi.toggleStatus(
        targetUser._id,
        nextStatus,
        `Account status changed to ${nextStatus} by Lead Admin`
      );
      fetchUsers();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Role counters
  const adminCount = users.filter((u) => u.role === 'MAINTENANCE_ADMIN').length;
  const opsCount = users.filter((u) => u.role === 'OPERATIONS_MANAGER').length;
  const techCount = users.filter((u) => u.role === 'TECHNICIAN').length;
  const vendorCount = users.filter((u) => u.role === 'VENDOR').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>User & Role Governance (RBAC Hub)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Least-privilege permission controls, account status lifecycle, access history audits, and organizational scope.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Permissions Matrix Button */}
          <button
            onClick={() => setShowPermissionsMatrix(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Role Permissions Matrix</span>
          </button>

          {/* Refresh Users Button */}
          <button
            onClick={fetchUsers}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {/* Provision User Button */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* Role Counts Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 block uppercase tracking-wider">
            Maintenance Admins
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{adminCount}</div>
          <span className="text-[11px] text-slate-400">Full System & RBAC Governance</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 block uppercase tracking-wider">
            Operations Managers
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{opsCount}</div>
          <span className="text-[11px] text-slate-400">Fleet Approvals & Reports Export</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 block uppercase tracking-wider">
            Field Technicians
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{techCount}</div>
          <span className="text-[11px] text-slate-400">Work Queue & Evidence Upload</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 block uppercase tracking-wider">
            Equipment Vendors
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{vendorCount}</div>
          <span className="text-[11px] text-slate-400">Chiller & BMC Servicing</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold"
          >
            <option value="">All Application Roles (4)</option>
            <option value="MAINTENANCE_ADMIN">Maintenance Admin</option>
            <option value="OPERATIONS_MANAGER">Operations Manager</option>
            <option value="TECHNICIAN">Field Technician</option>
            <option value="VENDOR">Equipment Vendor</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold"
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="DEACTIVATED">Deactivated Accounts</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <LoadingSkeleton count={4} />
      ) : error ? (
        <ErrorState title="User Directory Error" message={error} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No Users Found"
          message="No cooperative users match the search or filter criteria."
          actionLabel="Provision User"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">User Identity</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Organisational Scope</th>
                  <th className="py-3.5 px-4">Last Login Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => {
                  const isActive = u.accountStatus === 'ACTIVE';
                  let roleColor = 'bg-slate-100 text-slate-700';
                  if (u.role === 'MAINTENANCE_ADMIN') roleColor = 'bg-purple-100 text-purple-700';
                  else if (u.role === 'OPERATIONS_MANAGER') roleColor = 'bg-blue-100 text-blue-700';
                  else if (u.role === 'TECHNICIAN') roleColor = 'bg-emerald-100 text-emerald-700';
                  else if (u.role === 'VENDOR') roleColor = 'bg-amber-100 text-amber-700';

                  return (
                    <tr
                      key={u._id || u.email}
                      onClick={() => handleOpenDetails(u)}
                      className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-slate-500 text-[11px] font-mono">{u.email}</div>
                        {u.phone && <div className="text-slate-400 text-[10px]">{u.phone}</div>}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${roleColor}`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{u.accountStatus}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {u.orgScope?.cooperativeZone || 'Southern District Union'} (
                            {u.orgScope?.assignedPlants?.[0] || 'All Plants'})
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        <div>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</div>
                        {u.lastLoginIp && <div className="text-[10px] text-slate-400">IP: {u.lastLoginIp}</div>}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(u);
                            }}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="View Access History & Profile"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleOpenEditModal(u, e)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit User Account"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleToggleStatus(u, e)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                              isActive
                                ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
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

      {/* User Form Modal (Create & Edit) */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onUserSaved={() => fetchUsers()}
        userToEdit={selectedUserToEdit}
      />

      {/* User Access History & Details Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  User Account Profile & Access History
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Identity Snapshot */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Identity</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-slate-500">Full Name:</span> <span className="font-bold text-slate-800">{selectedUserForDetails.fullName}</span></div>
                  <div><span className="text-slate-500">Email:</span> <span className="font-mono text-slate-700">{selectedUserForDetails.email}</span></div>
                  <div><span className="text-slate-500">Assigned Role:</span> <span className="font-mono font-bold text-sky-700">{selectedUserForDetails.role}</span></div>
                  <div><span className="text-slate-500">Status:</span> <span className="font-bold text-emerald-700">{selectedUserForDetails.accountStatus}</span></div>
                  <div><span className="text-slate-500">Zone:</span> <span className="text-slate-700">{selectedUserForDetails.orgScope?.cooperativeZone || 'Southern District Union'}</span></div>
                  <div><span className="text-slate-500">Phone:</span> <span className="font-mono text-slate-700">{selectedUserForDetails.phone || 'N/A'}</span></div>
                </div>
              </div>

              {/* Access History Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Recent Login Access History
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedUserForDetails.accessHistory?.length || 0} events recorded
                  </span>
                </div>

                {(!selectedUserForDetails.accessHistory || selectedUserForDetails.accessHistory.length === 0) ? (
                  <div className="p-4 text-center text-slate-400 border border-slate-200 rounded-xl">
                    No recent login events recorded for this account.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedUserForDetails.accessHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border border-slate-200 rounded-xl bg-white flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-800 text-[11px]">{item.ip}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              SUCCESS
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-sm">{item.userAgent}</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Matrix Modal */}
      {showPermissionsMatrix && rolePermissions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Role & Permission Governance Matrix (Least-Privilege Defaults)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Authorized actions across users, master data, configuration, security policies, integrations, and audit access.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionsMatrix(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3 border border-slate-200">Governance Domain</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center">Maintenance Admin</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center">Operations Mgr</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center">Field Technician</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center">Equipment Vendor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-3 border border-slate-200 font-semibold text-slate-800">
                        1. User Management (Provision / Status)
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Full Control</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-600 font-medium">Read Only</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 border border-slate-200 font-semibold text-slate-800">
                        2. Role & Permission Governance
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Manage & Assign</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-600 font-medium">View</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 border border-slate-200 font-semibold text-slate-800">
                        3. Master Data (Equipment & Parts)
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Create / Edit</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">View / Tag</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-600 font-medium">Read Only</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-600 font-medium">Read Only</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 border border-slate-200 font-semibold text-slate-800">
                        4. Configuration & Thresholds
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Full Authority</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-600 font-medium">Read Only</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 border border-slate-200 font-semibold text-slate-800">
                        5. Security Policies (MFA / Session)
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Enforce / Audit</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 border border-slate-200 font-semibold text-slate-800">
                        6. Integrations (SCADA / ERP Hub)
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Connect / Sync</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-600 font-medium">View Status</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 border border-slate-200 font-semibold text-slate-800">
                        7. Audit Access & Export
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Full Export</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-emerald-600 font-bold">Full Export</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-300">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowPermissionsMatrix(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close Matrix View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
