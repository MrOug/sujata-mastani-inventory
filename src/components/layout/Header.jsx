import React from 'react';
import { Store, ChevronDown } from 'lucide-react';

const Header = ({
    selectedStoreId,
    stores,
    onStoreChange,
    role,
    username,
    isOnline = true
}) => {
    return (
        <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
            <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo & Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                            <span className="text-xl">🥤</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold font-display tracking-tight">Sujata Mastani</h1>
                            <p className="text-xs opacity-90 font-medium">{username || 'Inventory Manager'}</p>
                        </div>
                    </div>

                    {/* Connection Status */}
                    {!isOnline && (
                        <div className="absolute top-full left-0 right-0 bg-red-600 text-white text-center text-xs py-1 font-bold animate-pulse">
                            ⚠️ Offline - Changes may not save
                        </div>
                    )}

                    {/* Store Selector (Admin) */}
                    {role === 'admin' && Object.keys(stores).length > 0 && (
                        <div className="relative group">
                            <select
                                value={selectedStoreId}
                                onChange={(e) => onStoreChange(e.target.value)}
                                className="appearance-none bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 pr-8 text-sm font-medium backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer hover:bg-white/30 transition"
                            >
                                <option value="" className="text-gray-900">Select Store</option>
                                {Object.entries(stores).map(([id, store]) => (
                                    <option key={id} value={id} className="text-gray-900">
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-80" />
                        </div>
                    )}

                    {/* Staff Store Badge */}
                    {role === 'staff' && selectedStoreId && stores[selectedStoreId] && (
                        <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                            <Store className="w-4 h-4" />
                            <span className="text-sm font-medium">{stores[selectedStoreId].name}</span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
