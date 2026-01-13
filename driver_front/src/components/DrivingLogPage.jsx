import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import { getLogsByUserId } from '../utils/LogService';

const LogEntry = ({ date, score, msg, status }) => (
    <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-colors">
        <div className="flex gap-4 items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${status === 'perfect' ? 'bg-green-100 text-green-600' : status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{score}</div>
            <div>
                <p className="text-xs font-bold text-slate-400 mb-0.5 font-mono italic">{date}</p>
                <p className="text-sm font-bold text-slate-800">{msg}</p>
            </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 shrink-0" />
    </div>
);

const DrivingLogPage = ({ onSelectLog }) => {
    const { user } = useAuth();
    const [userLogs, setUserLogs] = useState([]);

    useEffect(() => {
        if (user) {
            const logs = getLogsByUserId(user.id);
            setUserLogs(logs);
        }
    }, [user]);

    return (
        <div className="animate-in fade-in duration-500">
            <Header type="log" />
            <div className="p-6 pt-2">
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-800">{user?.name}님의 기록</h2>
                    <p className="text-xs text-slate-400">Total {userLogs.length} sessions</p>
                </div>
                <div className="space-y-3">
                    {userLogs.length > 0 ? (
                        userLogs.map(log => (
                            <div key={log.id} onClick={() => onSelectLog(log)} className="cursor-pointer">
                                <LogEntry date={log.date} score={log.score} msg={log.msg} status={log.status} />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-sm">아직 주행 기록이 없습니다.</p>
                            <p className="text-xs mt-1">안전 운전을 시작해보세요!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DrivingLogPage;
