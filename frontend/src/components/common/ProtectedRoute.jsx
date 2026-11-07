import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-dairy-200 border-t-dairy-600 rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-500 font-mono">Verifying Cooperative Credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check RBAC role authorization
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 my-8 text-center max-w-2xl mx-auto shadow-xs">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 uppercase tracking-wider">
          403 Access Forbidden
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-3 mb-2">Least-Privilege Security Boundary</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-4">
          Your current active role <strong className="font-semibold text-slate-900">{role}</strong> does not possess
          clearance to access this module.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 max-w-sm mx-auto mb-6 text-left">
          <p className="font-semibold text-slate-700 mb-1">Permitted Roles for this Module:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
            {allowedRoles.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-center space-x-3">
          <Link
            to="/assets"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

