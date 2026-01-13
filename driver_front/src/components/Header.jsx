import React from 'react';
import { ShieldCheck, User, Car, History, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ type = 'drive', isActive, averageScore, discountRate }) => {
    const { logout } = useAuth();
    // Added h-[88px] to fix the height, and flex items-center for vertical alignment
    const commonClasses = "px-6 bg-white/90 backdrop-blur-xl z-30 sticky top-0 border-b border-gray-100 shadow-sm h-[88px] flex items-center";

    // Common Title Component to ensure consistency
    const HeaderTitle = ({ icon: Icon, title, subtitle }) => (
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-200">
                <Icon className="text-white" size={20} />
            </div>
            <div>
                <h1 className="text-xl font-black text-slate-900 leading-none mb-0.5">{title}</h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{subtitle}</p>
            </div>
        </div>
    );

    if (type === 'insurance') {
        return (
            <header className={commonClasses}>
                <div className="w-full flex justify-between items-center">
                    <HeaderTitle
                        icon={ShieldCheck}
                        title="Smart Mobility"
                        subtitle="UBI System"
                    />

                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl shadow-inner border border-gray-100">
                        <div className="px-2 border-r border-gray-200 text-right">
                            <p className="text-[9px] font-bold text-gray-400">할인율</p>
                            <p className="text-base font-black text-blue-600">{discountRate}%</p>
                        </div>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <User size={16} className="text-gray-400" />
                        </div>
                    </div>
                </div>
            </header>
        );
    }

    if (type === 'log') {
        return (
            <header className={commonClasses}>
                <div className="w-full flex justify-between items-center">
                    <HeaderTitle
                        icon={History}
                        title="Driving Log"
                        subtitle="Recent History"
                    />
                    <button onClick={logout} className="p-2 bg-red-50 rounded-xl text-red-500 hover:bg-red-100 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>
        );
    }

    // Default: 'drive'
    return (
        <header className={commonClasses}>
            <div className="w-full flex justify-between items-center">
                <HeaderTitle
                    icon={Car}
                    title="My Driving"
                    subtitle={isActive ? 'Session Active' : 'Ready to Drive'}
                />

                <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Avg Score</span>
                    <p className="text-xl font-black text-slate-900 leading-none">{averageScore}</p>
                </div>
            </div>
        </header>
    );
};

export default Header;
