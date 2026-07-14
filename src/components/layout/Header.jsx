import React from 'react';
import { MoreVertical } from 'lucide-react';

const Header = ({ title, showBack, onBack }) => {
    return (
        <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="px-4 py-4 flex items-center justify-between">
                {showBack ? (
                    <button onClick={onBack} className="p-1 -ml-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                ) : null}
                <h1 className={`text-xl font-bold font-display ${showBack ? '' : 'flex-1'}`}>{title}</h1>
                {!showBack && (
                    <button className="p-1">
                        <MoreVertical className="w-6 h-6" />
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
