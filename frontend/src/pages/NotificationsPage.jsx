import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Wrench,
  Check,
  CheckCheck,
  RefreshCw,
  Sparkles,
  Sliders,
  Filter,
  Search,
  Trash2,
  X,
  Building2,
  Shield,
  Layers,
  Info
} from 'lucide-react';
import notificationApi from '../api/notificationApi';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Notifications' },
  { id: 'UNREAD', label: 'Unread' },
  { id: 'READ', label: 'Read' },
  { id: 'URGENT', label: 'Urgent Alarms' },
  { id: 'ASSIGNED', label: 'Assigned Work' },
  { id: 'SYSTEM_GENERATED', label: 'System Events' }
];

const EVENT_TYPE_OPTIONS = [
  { id: 'ALL', label: 'All Event Types' },
  { id: 'ASSIGNMENT', label: 'Work Assignments' },
  { id: 'EXCEPTION', label: 'Telemetry Exceptions' },
  { id: 'APPROVAL', label: 'Closure Approvals' },
  { id: 'ALERT', label: 'Critical Failure Alerts' },
  { id: 'DUE_DATE', label: 'Due Date Reminders' },
  { id: 'AI_RESULT', label: 'AI RUL Predictions' },
  { id: 'SYSTEM_EVENT', label: 'System Operations' }
];

const SEVERITY_OPTIONS = [
  { id: 'ALL', label: 'All Severities' },
  { id: 'CRITICAL_URGENT', label: 'Critical / Urgent' },
  { id: 'WARNING', label: 'Warning' },
  { id: 'INFO', label: 'Informational' }
];

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Preferences Modal State
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [prefsSuccessMessage, setPrefsSuccessMessage] = useState('');

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getNotifications({
        category: activeTab !== 'ALL' ? activeTab : undefined,
        eventType: eventTypeFilter !== 'ALL' ? eventTypeFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined
      });
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
        setUrgentCount(res.data.urgentCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Unable to retrieve notification feed.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, eventTypeFilter, severityFilter]);

  const fetchPreferences = async () => {
    try {
      const res = await notificationApi.getPreferences();
      if (res?.data?.preferences) {
        setPreferences(res.data.preferences);
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchPreferences();
  }, []);

  // Mark single as read
  const handleMarkAsRead = async (id, targetLink, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      fetchNotifications();
      if (targetLink) {
        navigate(targetLink);
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // Clear single notification
  const handleClear = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.clearNotification(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to clear notification:', err);
    }
  };

  // Clear all read notifications
  const handleClearRead = async () => {
    if (!window.confirm('Clear all read notifications from your feed?')) return;
    try {
      await notificationApi.clearAllNotifications({ readOnly: true });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setIsSavingPreferences(true);
    setPrefsSuccessMessage('');
    try {
      const res = await notificationApi.updatePreferences(preferences);
      if (res?.data) {
        setPreferences(res.data.preferences);
        setPrefsSuccessMessage('Preferences updated successfully!');
        setTimeout(() => {
          setShowPreferencesModal(false);
          setPrefsSuccessMessage('');
          fetchNotifications();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to update preferences:', err);
      alert('Error updating preferences: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const getEventIcon = (eventType, severity) => {
    if (severity === 'CRITICAL_URGENT') {
      return <ShieldAlert className="w-5 h-5 text-rose-600" />;
    }
    switch (eventType) {
      case 'AI_RESULT':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'ASSIGNMENT':
        return <Wrench className="w-5 h-5 text-sky-600" />;
      case 'DUE_DATE':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'EXCEPTION':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'APPROVAL':
        return <Check className="w-5 h-5 text-indigo-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  // Client-side search matching
  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      n.title?.toLowerCase().includes(query) ||
      n.message?.toLowerCase().includes(query) ||
      n.eventType?.toLowerCase().includes(query) ||
      n.relatedEntity?.entityId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Notifications & Operational Alerts Center</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
              {unreadCount} unread • {urgentCount} urgent
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time cold-chain exceptions, work order assignments, supervisor sign-offs, and AI predictive alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Notification Preferences Button */}
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Preferences</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchNotifications}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {/* Clear Read Notifications */}
          <button
            onClick={handleClearRead}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Clear already-read notifications"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Read</span>
          </button>

          {/* Mark All as Read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Tab Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Row 1: Primary Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === cat.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
              {cat.id === 'UNREAD' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-200 text-sky-900">
                  {unreadCount}
                </span>
              )}
              {cat.id === 'URGENT' && urgentCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900">
                  {urgentCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Row 2: Secondary Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Event Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Event Type
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold focus:ring-1 focus:ring-sky-500"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Severity Level
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold focus:ring-1 focus:ring-sky-500"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Table */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search Alerts
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by keyword or asset tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <LoadingSkeleton count={4} />
      ) : error ? (
        <ErrorState
          title="Notification Feed Error"
          message={error}
          onRetry={fetchNotifications}
        />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          title="No Active Notifications"
          message="You are completely caught up! No operational alerts match the selected tab or criteria."
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n, idx) => {
            const isUrgent = n.severity === 'CRITICAL_URGENT' || n.category === 'URGENT';
            return (
              <div
                key={n._id || n.notificationId || idx}
                onClick={() => handleMarkAsRead(n._id || n.notificationId, n.targetLink)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !n.isRead
                    ? isUrgent
                      ? 'bg-rose-50/60 border-rose-300 shadow-sm'
                      : 'bg-sky-50/50 border-sky-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <div className="flex items-start space-x-3.5 flex-1">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isUrgent
                        ? 'bg-rose-100 text-rose-700'
                        : n.eventType === 'AI_RESULT'
                        ? 'bg-purple-100 text-purple-700'
                        : n.eventType === 'ASSIGNMENT'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {getEventIcon(n.eventType, n.severity)}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700'
                          : n.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {n.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                        {n.eventType}
                      </span>
                      {n.relatedEntity?.entityId && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-800">
                          {n.relatedEntity.entityId}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1 font-mono">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>Ref: {n._id || n.notificationId}</span>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {n.targetLink && (
                    <button
                      onClick={(e) => handleMarkAsRead(n._id || n.notificationId, n.targetLink, e)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition-colors"
                      title="Navigate to related record"
                    >
                      <span>Open Record</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!n.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(n._id || n.notificationId, null, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => handleClear(n._id || n.notificationId, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Dismiss alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notification Preferences Modal */}
      {showPreferencesModal && preferences && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Notification Delivery Preferences
                </h3>
              </div>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="p-5 space-y-5 text-xs">
              {prefsSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{prefsSuccessMessage}</span>
                </div>
              )}

              {/* Role Scope */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Role Profile
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">{preferences.role || user?.role}</span>
                  <span className="text-[10px] text-slate-400 font-mono">RBAC Enforced</span>
                </div>
              </div>

              {/* Event Types Allowed */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Subscribed Event Types
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.keys(preferences.eventTypes || {}).map((et) => (
                    <label
                      key={et}
                      className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(preferences.eventTypes[et])}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            eventTypes: {
                              ...preferences.eventTypes,
                              [et]: e.target.checked
                            }
                          })
                        }
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-semibold text-slate-700">
                        {et === 'AI_RESULT' ? 'AI Predictions & RUL' : et.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Severity Threshold */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Minimum Severity Threshold
                </label>
                <select
                  value={preferences.minSeverity}
                  onChange={(e) => setPreferences({ ...preferences, minSeverity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500"
                >
                  <option value="INFO">Informational & Above (All notifications)</option>
                  <option value="WARNING">Warning & Above (Skip benign notifications)</option>
                  <option value="CRITICAL_URGENT">Critical / Urgent Alarms Only</option>
                </select>
              </div>

              {/* Ownership Scope */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Ownership & Allocation Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, ownership: 'ALL_FACILITY' })}
                    className={`p-3 rounded-xl border text-left font-medium transition-all ${
                      preferences.ownership === 'ALL_FACILITY'
                        ? 'border-sky-500 bg-sky-50 text-sky-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>All Facility Assets</div>
                    <div className="text-[10px] text-slate-400 font-normal">Entire plant or zone</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, ownership: 'ASSIGNED_TO_ME' })}
                    className={`p-3 rounded-xl border text-left font-medium transition-all ${
                      preferences.ownership === 'ASSIGNED_TO_ME'
                        ? 'border-sky-500 bg-sky-50 text-sky-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>Assigned to Me Only</div>
                    <div className="text-[10px] text-slate-400 font-normal">Directly owned tasks</div>
                  </button>
                </div>
              </div>

              {/* Organisational Scope */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Organisational Scope Filter
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-xs">
                  <div><span className="text-slate-400">Zone:</span> <span className="font-bold text-slate-700">{preferences.orgScope?.cooperativeZone || 'Southern Region (All)'}</span></div>
                  <div><span className="text-slate-400">Plant / Route:</span> <span className="font-bold text-slate-700">{preferences.orgScope?.plantId || 'ALL'}</span></div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPreferences}
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSavingPreferences ? 'Saving...' : 'Save Notification Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
