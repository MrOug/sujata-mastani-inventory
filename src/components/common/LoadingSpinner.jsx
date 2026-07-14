import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading...' }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <Loader className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">{message}</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;
