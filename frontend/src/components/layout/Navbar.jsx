import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Search,
  Shield,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Building2,
  SlidersHorizontal,
  X,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Wrench,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import notificationApi from '../../api/notificationApi';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications Panel State
  const [panelTab, setPanelTab] = useState('ALL'); // ALL, UNREAD, URGENT
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const panelRef = useRef(null);

  const fetchPanelNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const res = await notificationApi.getNotifications({
        category: panelTab !== 'ALL' ? panelTab : undefined
      });
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications in panel:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchPanelNotifications();
    const interval = setInterval(fetchPanelNotifications, 45000); // polling interval
    return () => clearInterval(interval);
  }, [panelTab]);

  // Close panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotificationPanel(false);
      }
    };
    if (showNotificationPanel) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotificationPanel]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/assets?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAsRead = async (id, targetLink, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      fetchPanelNotifications();
      if (targetLink) {
        setShowNotificationPanel(false);
        navigate(targetLink);
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleClear = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.clearNotification(id);
      fetchPanelNotifications();
    } catch (err) {
      console.error('Failed to clear notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      fetchPanelNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getEventIcon = (eventType, severity) => {
    if (severity === 'CRITICAL_URGENT') {
      return <ShieldAlert className="w-4 h-4 text-rose-600" />;
    }
    switch (eventType) {
      case 'AI_RESULT':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'ASSIGNMENT':
        return <Wrench className="w-4 h-4 text-sky-600" />;
      case 'DUE_DATE':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'EXCEPTION':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'APPROVAL':
        return <Check className="w-4 h-4 text-indigo-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'MAINTENANCE_ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OPERATIONS_MANAGER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TECHNICIAN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VENDOR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-dairy-50 text-dairy-700 border-dairy-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Scope Indicator */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Cooperative & Scope Badge */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs shadow-2xs">
          <Building2 className="w-4 h-4 text-dairy-600" />
          <span className="font-semibold text-slate-700">Dairy Union Federation</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Zone:</span>
          <span className="font-medium text-dairy-700 bg-dairy-50 px-2 py-0.5 rounded-md border border-dairy-100">
            {user?.orgScope?.cooperativeZone || 'Southern Region (All)'}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-dairy-600 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets (e.g. BMC-018), work orders, or chilling centers..."
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dairy-500/30 focus:border-dairy-500 focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded shadow-2xs">
              ↵
            </span>
          )}
        </div>
      </form>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center space-x-3">
        {/* In-App Notification Bell & Dropdown Panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className={`relative p-2 rounded-xl transition ${
              showNotificationPanel
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            aria-label="Open notifications panel"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white"></span>
              </span>
            )}
          </button>

          {/* In-App Notification Panel Dropdown */}
          {showNotificationPanel && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Panel Header */}
              <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-700 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Panel Quick Tabs */}
              <div className="px-4 py-2 flex items-center space-x-1.5 bg-slate-50/70 border-b border-slate-100 text-xs">
                {['ALL', 'UNREAD', 'URGENT'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPanelTab(t)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      panelTab === t
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t === 'UNREAD' ? 'Unread' : 'Urgent Alarms'}
                  </button>
                ))}
              </div>

              {/* Panel Notification Items */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {isLoadingNotifications ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active {panelTab.toLowerCase()} notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id || n.notificationId}
                      onClick={() => handleMarkAsRead(n._id || n.notificationId, n.targetLink)}
                      className={`p-3 sm:px-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                        !n.isRead ? 'bg-sky-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                          {getEventIcon(n.eventType, n.severity)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-1">
                            <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span>{n.eventType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                        <button
                          onClick={(e) => handleClear(n._id || n.notificationId, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Dismiss notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setShowNotificationPanel(false)}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-sky-700 hover:text-sky-800"
                >
                  <span>Open Full Notifications Center</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-xl bg-dairy-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:block text-left">
              <div className="flex items-center space-x-1.5">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName || 'User'}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${getRoleBadgeStyle(role)}`}>
                  {role?.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{user?.email || 'admin@dairycoop.org'}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {/* Backdrop for outside click */}
          {showUserMenu && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
          )}

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{user?.fullName || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-2 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getRoleBadgeStyle(role)}`}>
                    {role?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <Link
                to="/users"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-dairy-700 transition"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>User Directory</span>
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
