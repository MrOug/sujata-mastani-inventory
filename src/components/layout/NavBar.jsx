import React from 'react';
import { LayoutDashboard, BarChart2, Truck, PieChart, Settings } from 'lucide-react';

const NavButton = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 ${
            isActive
                ? 'text-orange-500'
                : 'text-gray-400'
        }`}
    >
        <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
        <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
);

const NavBar = ({ view, setView }) => {
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'summary', icon: BarChart2, label: 'Summary' },
        { id: 'dispatch', icon: Truck, label: 'Dispatch' },
        { id: 'reports', icon: PieChart, label: 'Reports' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-white border-t border-gray-200 w-full max-w-lg pointer-events-auto safe-area-bottom">
                <div className="flex items-center justify-around">
                    {navItems.map(item => (
                        <NavButton
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={view === item.id}
                            onClick={() => setView(item.id)}
                        />
                    ))}
                </div>
                {/* Orange indicator line */}
                <div className="h-1 bg-orange-500 mx-auto" style={{ width: '80%' }} />
            </div>
        </nav>
    );
};

export default NavBar;
