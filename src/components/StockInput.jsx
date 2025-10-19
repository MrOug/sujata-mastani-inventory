import React from 'react';

const StockInput = ({ label, value, onChange, placeholder = '0' }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg mb-2 border border-gray-100">
    <label className="text-sm font-medium text-gray-800 w-1/2 overflow-hidden whitespace-nowrap text-ellipsis pr-2">
      {label}
    </label>
    <input
      type="number"
      min="0"
      step="0.01"
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      className="w-1/3 p-2 text-base text-right bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150 shadow-inner"
    />
  </div>
);

export default StockInput;
