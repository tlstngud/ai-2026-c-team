import React from 'react';

const Header = ({ isActive, averageScore }) => {
    return (
        <header className="px-6 pt-6 pb-3 bg-white/90 backdrop-blur-xl z-30 sticky top-0 border-b border-gray-100">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {isActive ? 'Session Active' : 'Ready to Drive'}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-black">My Driving</h1>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-400 font-medium">Avg Score</span>
                    <p className="text-lg font-bold">{averageScore}</p>
                </div>
            </div>
        </header>
    );
};

export default Header;
