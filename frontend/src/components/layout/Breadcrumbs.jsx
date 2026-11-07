import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNameMap = {
  assets: 'Asset Registry & Health',
  calendar: 'Maintenance Calendar & Technician Queue',
  planning: 'Planning & Closure Verification',
  predictions: 'AI Predictions',
  rul: 'Failure Risk & Remaining Useful Life',
  recommendations: 'Maintenance Recommendations (HITL)',
  'mlops-performance': 'Reliability & Model Performance (MLOps)',
  'analytics-reports': 'Reports & Visual Analytics',
  notifications: 'Notifications Center',
  users: 'User & Role Management',
  'audit-settings': 'Audit Logs & Master Settings',
  login: 'Sign In'
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] === 'login') return null;

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link to="/assets" className="flex items-center space-x-1 hover:text-dairy-700 transition">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Cooperative</span>
      </Link>

      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[segment] || segment.toUpperCase();

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 truncate">{displayName}</span>
            ) : (
              <Link to={routeTo} className="hover:text-dairy-700 transition truncate">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

