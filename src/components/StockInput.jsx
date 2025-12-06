import React from 'react';
import { Minus, Plus } from 'lucide-react';

const StockInput = ({ label, value, onChange, category, item }) => {
  const handleIncrement = () => onChange(Math.min((value || 0) + 1, 1000));
  const handleDecrement = () => onChange(Math.max((value || 0) - 1, 0));

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
      <span className="text-gray-900 font-medium flex-1 pr-2">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          className="w-9 h-9 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-bold transition touch-manipulation"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value === 0 || value === '' ? '' : value}
          onChange={(e) => {
            const inputVal = e.target.value;
            if (inputVal === '' || inputVal === '-') {
              onChange(0);
              return;
            }
            const val = parseFloat(inputVal);
            if (!isNaN(val) && val >= 0 && val <= 1000) {
              onChange(val);
            }
          }}
          className="w-20 h-9 text-center text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
          min="0"
          max="1000"
          aria-label={`Quantity for ${label}`}
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="w-9 h-9 flex items-center justify-center bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-bold transition touch-manipulation"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StockInput;

