import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const ErrorState = ({
  title = 'Failed to Load Operational Data',
  message = 'An unexpected network error or server timeout occurred while communicating with the dairy telemetry gateway.',
  onRetry = null,
  errorCode = 'ERR_CONN_TIMEOUT'
}) => {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 my-6 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 mb-1">{title}</h3>
      <p className="text-sm text-rose-700 max-w-lg mb-2">{message}</p>
      {errorCode && (
        <span className="inline-block font-mono text-xs text-rose-500 bg-rose-100/60 px-2 py-0.5 rounded mb-4">
          Code: {errorCode}
        </span>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;

