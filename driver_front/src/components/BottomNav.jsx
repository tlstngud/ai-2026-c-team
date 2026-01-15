import React from 'react';
import { useLocation } from 'react-router-dom';
import { Video, ShieldCheck, History, Award, User } from 'lucide-react';

const NavButton = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-14 ${active ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
        <div className={`flex items-center justify-center ${active ? 'bg-indigo-50 p-2 rounded-xl' : 'p-2'}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">{label}</span>
    </button>
);

const BottomNav = ({ onPageChange, selectedLog, showCameraView, showChallengeDetail = false }) => {
    const location = useLocation();
    
    // URL 경로에서 현재 페이지 확인
    const getCurrentPage = () => {
        const path = location.pathname;
        if (path.startsWith('/log/')) return 'log-detail';
        if (path.startsWith('/challenge/')) return 'challenge-detail';
        if (path === '/insurance' || path === '/challenge') return 'insurance';
        if (path === '/log') return 'log';
        if (path === '/insurance-policy') return 'mypage';
        if (path === '/mypage') return 'mypage';
        return 'drive';
    };
    
    const currentPage = getCurrentPage();
    
    if (selectedLog || currentPage === 'log-detail' || currentPage === 'challenge-detail') return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 flex justify-center py-3 px-4 z-50 pointer-events-none sm:pointer-events-auto transition-transform duration-300 ease-in-out ${showCameraView || showChallengeDetail ? 'translate-y-full' : 'translate-y-0'
                }`}
        >
            <nav className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl flex justify-around items-center h-20 px-6 py-3 w-[90%] max-w-[360px] sm:max-w-[360px]">
                <NavButton
                    active={currentPage === 'drive'}
                    onClick={() => onPageChange('drive')}
                    icon={<Video size={22} />}
                    label="드라이브"
                />
                <NavButton
                    active={currentPage === 'insurance'}
                    onClick={() => onPageChange('insurance')}
                    icon={<Award size={22} />}
                    label="우리동네"
                />
                <NavButton
                    active={currentPage === 'log'}
                    onClick={() => onPageChange('log')}
                    icon={<History size={22} />}
                    label="주행기록"
                />
                <NavButton
                    active={currentPage === 'mypage'}
                    onClick={() => onPageChange('mypage')}
                    icon={<User size={22} />}
                    label="내 정보"
                />
            </nav>
        </div>
    );
};

export default BottomNav;
