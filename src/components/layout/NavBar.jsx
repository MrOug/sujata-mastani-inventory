import React from 'react';
import { Home, List, TrendingDown, ShoppingCart, Settings, Users, Store, Package, BarChart2, History, LogOut, ChevronDown } from 'lucide-react';

const NavButton = ({ icon: Icon, label, isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 w-full ${isActive
            ? 'bg-orange-100 text-orange-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
    >
        {Icon && <Icon className="w-5 h-5 mb-1" />}
        <span className="text-xs font-medium whitespace-nowrap">{label}</span>
        {children}
    </button>
);

const NavBar = ({ view, setView, role, onLogout }) => {
    const isAdmin = role === 'admin';
    const [showAdminSubmenu, setShowAdminSubmenu] = React.useState(false);

    // Main navigation items for both roles
    const mainNavItems = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'stock', icon: List, label: 'Stock' },
        { id: 'sold', icon: TrendingDown, label: 'Sold' },
        { id: 'order', icon: ShoppingCart, label: 'Order' },
    ];

    // Admin-only items
    const adminNavItems = [
        { id: 'order-stats', icon: BarChart2, label: 'Stats' },
        { id: 'order-history', icon: History, label: 'History' },
        { id: 'stores', icon: Store, label: 'Stores' },
        { id: 'users', icon: Users, label: 'Users' },
        { id: 'items', icon: Package, label: 'Items' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] w-full max-w-lg pointer-events-auto safe-area-bottom">
                <div className="flex items-center justify-around py-2 px-2">
                    {/* Main Nav Items */}
                    {mainNavItems.map(item => (
                        <NavButton
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={view === item.id}
                            onClick={() => setView(item.id)}
                        />
                    ))}

                    {/* Admin Menu */}
                    {isAdmin && (
                        <div className="relative">
                            <NavButton
                                icon={Settings}
                                label="Admin"
                                isActive={['order-stats', 'order-history', 'stores', 'users', 'items'].includes(view)}
                                onClick={() => setShowAdminSubmenu(!showAdminSubmenu)}
                            >
                                <ChevronDown className={`w-3 h-3 transition-transform ${showAdminSubmenu ? 'rotate-180' : ''}`} />
                            </NavButton>

                            {showAdminSubmenu && (
                                <div className="absolute bottom-full mb-2 right-0 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden">
                                    {adminNavItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setView(item.id);
                                                setShowAdminSubmenu(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${view === item.id
                                                ? 'bg-orange-50 text-orange-700'
                                                : 'text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </button>
                                    ))}
                                    <hr className="my-2 border-gray-100" />
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span className="text-sm font-medium">Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Staff Logout */}
                    {!isAdmin && (
                        <NavButton
                            icon={LogOut}
                            label="Logout"
                            isActive={false}
                            onClick={onLogout}
                        />
                    )}
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
