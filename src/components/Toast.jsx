import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-500',
    info: 'bg-blue-600'
  };

  return (
    <div className={`${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] max-w-[90vw] animate-slideIn`}>
      {icons[type]}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
