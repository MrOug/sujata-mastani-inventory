import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 text-orange-600">
    <Loader className="animate-spin w-10 h-10 mb-4 text-orange-600" />
    <p className="text-xl font-display text-gray-700">Initializing Secure App...</p>
  </div>
);

export default LoadingSpinner;
