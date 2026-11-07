import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import {
  Milk,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Building2,
  KeyRound,
  X,
  ArrowRight
} from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState('');

  // 4 Demo Role Accounts for instant 1-click evaluation
  const demoAccounts = [
    {
      role: 'Maintenance Admin',
      email: 'admin@dairycoop.org',
      pass: 'Admin@123',
      badge: 'Full Cooperative Access',
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      role: 'Operations Manager',
      email: 'ops@dairycoop.org',
      pass: 'Ops@123',
      badge: 'Plant & Work Order Approvals',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      role: 'Field Technician',
      email: 'tech@dairycoop.org',
      pass: 'Tech@123',
      badge: 'Queue & Mobile Evidence',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      role: 'Equipment Vendor',
      email: 'vendor@cooltech.com',
      pass: 'Vendor@123',
      badge: 'Assigned Chiller Spares',
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  ];

  const handleSelectDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setFieldErrors({});
    setErrorMessage('');
  };

  const validateForm = () => {
    const errors = {};
    if (!email) {
      errors.email = 'Cooperative email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email format';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { user, defaultRoute } = await login(email, password, rememberMe);
      setSuccessMessage(`Authentication verified. Welcome back, ${user.fullName}!`);

      // Determine destination route
      const destination = location.state?.from?.pathname || defaultRoute || '/assets';

      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 700);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your credentials or network connection.'
      );
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    try {
      const res = await axiosClient.post('/auth/forgot-password', { email: forgotEmail });
      setForgotNotice(
        res.message || 'Recovery instructions have been dispatched to your email address.'
      );
    } catch (err) {
      setForgotNotice('If the account exists, recovery instructions have been dispatched.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Cold-Chain Background Accents */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-dairy-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-dairy-600 text-white shadow-lg shadow-dairy-600/30 mb-4 ring-4 ring-slate-800">
          <Milk className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white">
          Dairy Cooperative Supply Chain
        </h2>
        <p className="mt-1 text-xs text-dairy-300 font-medium">
          Smart Asset Reliability & Maintenance Suite
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-100 sm:px-10">
          {/* Header Info */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <span className="text-[10px] font-mono font-bold text-dairy-600 bg-dairy-50 px-2 py-0.5 rounded border border-dairy-200">
                MODULE 01
              </span>
              <h3 className="text-base font-bold text-slate-800 mt-1">Authorized Gateway</h3>
            </div>
            <div className="flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>JWT + RBAC</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <p className="font-semibold text-rose-800">Authentication Failed</p>
                <p className="text-rose-600 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cooperative Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                  }}
                  placeholder="e.g. admin@dairycoop.org"
                  className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition ${
                    fieldErrors.email
                      ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:ring-dairy-500 focus:bg-white'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-medium text-dairy-600 hover:text-dairy-700 transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
                  }}
                  placeholder="••••••••••••"
                  className={`w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition ${
                    fieldErrors.password
                      ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:ring-dairy-500 focus:bg-white'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-dairy-600 border-slate-300 focus:ring-dairy-500"
                  disabled={isLoading}
                />
                <span>Remember this terminal session</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating with Gateway...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Cooperative Suite</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Selector Pills */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                1-Click Role Testing
              </span>
              <span className="text-[10px] text-slate-400">Click to fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  className={`p-2.5 rounded-xl border text-left transition hover:shadow-xs group ${acc.color}`}
                >
                  <p className="text-xs font-bold leading-tight group-hover:underline">{acc.role}</p>
                  <p className="text-[10px] opacity-75 truncate mt-0.5">{acc.badge}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Organization Tag */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center space-x-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Dairy Cooperative Union Federation &bull; Secure Infrastructure</span>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotNotice('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 bg-dairy-50 text-dairy-600 rounded-xl flex items-center justify-center mb-3">
              <KeyRound className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-800">Password Recovery</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Enter your registered cooperative email to receive recovery instructions.
            </p>

            {forgotNotice && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs">
                {forgotNotice}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tech@dairycoop.org"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dairy-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-2 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60"
              >
                {forgotLoading ? 'Dispatching...' : 'Send Recovery Token'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

