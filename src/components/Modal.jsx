import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative border border-orange-100">
      <h3 className="text-2xl font-bold font-display text-orange-700 border-b border-gray-200 pb-3 mb-4">
        {title}
      </h3>
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-orange-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  </div>
);

export default Modal;
