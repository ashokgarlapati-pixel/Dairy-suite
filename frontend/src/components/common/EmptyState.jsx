import React from 'react';
import { Inbox, Plus } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No Records Found',
  description = 'There are no active records matching your current filter criteria.',
  actionLabel = null,
  onAction = null
}) => {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center flex flex-col items-center justify-center my-6">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-dairy-600 hover:bg-dairy-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;

