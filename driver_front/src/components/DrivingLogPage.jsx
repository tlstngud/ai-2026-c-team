import React from 'react';
import { ChevronRight } from 'lucide-react';

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

const DrivingLogPage = ({ onSelectLog, history = [] }) => {
    const defaultLogs = [
        { id: 1, date: "2024.05.20", score: 95, msg: "완벽한 주행", status: "perfect", time: "08:30 - 09:45", distance: "24km" },
        { id: 2, date: "2024.05.19", score: 72, msg: "졸음 부주의", status: "warning", time: "14:20 - 15:10", distance: "12km" },
        { id: 3, date: "2024.05.18", score: 84, msg: "휴대폰 조작", status: "normal", time: "18:00 - 19:30", distance: "35km" },
    ];

    const historyLogs = history.map((item, idx) => ({
        id: `history-${idx}`,
        date: new Date(item.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.').replace(/\s/g, ''),
        score: item.score,
        msg: item.score >= 90 ? "완벽한 주행" : item.events > 0 ? "이상 행동 감지" : "정상 주행",
        status: item.score >= 90 ? "perfect" : item.score >= 70 ? "normal" : "warning",
        time: `${Math.floor(item.duration / 60)}분 주행`,
        distance: `${Math.floor(item.duration * 0.5)}km`
    }));

    const logs = [...historyLogs, ...defaultLogs].slice(0, 10);

    return (
        <div className="p-6 animate-in fade-in duration-500">
            <header className="mb-6">
                <h1 className="text-2xl font-black">주행 로그</h1>
                <p className="text-xs text-slate-400 font-medium italic uppercase tracking-tighter">Recent History</p>
            </header>
            <div className="space-y-3">
                {logs.map(log => (
                    <div key={log.id} onClick={() => onSelectLog(log)} className="cursor-pointer">
                        <LogEntry date={log.date} score={log.score} msg={log.msg} status={log.status} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DrivingLogPage;
