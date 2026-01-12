import React from 'react';
import { ChevronLeft, Clock, MapPin, Coffee, Smartphone } from 'lucide-react';

const DetailItem = ({ icon, title, count, desc }) => (
    <div className="flex items-start gap-4">
        <div className="bg-slate-50 p-3 rounded-2xl shrink-0">{icon}</div>
        <div className="flex-grow border-b border-slate-50 pb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black text-slate-800">{title}</span>
                <span className="text-sm font-black text-slate-400">{count}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{desc}</p>
        </div>
    </div>
);

const LogDetailPage = ({ data, onBack }) => (
    <div className="p-6 animate-in slide-in-from-right duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold mb-6 hover:text-slate-900 transition-colors">
            <ChevronLeft size={20} />
            <span className="text-sm">뒤로가기</span>
        </button>

        <header className="mb-8">
            <div className="flex justify-between items-start mb-2">
                <h1 className="text-2xl font-black text-slate-900">
                    {data.date} <span className="text-base font-normal text-slate-400 italic">Report</span>
                </h1>
                <div className={`px-3 py-1 rounded-full text-xs font-black ${data.status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {data.score} PTS
                </div>
            </div>
            <div className="flex flex-wrap gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><Clock size={12} /> {data.time}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {data.distance}</span>
            </div>
        </header>

        <div className="grid grid-cols-1 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">운행 평가</p>
                <p className="text-lg font-black leading-tight text-slate-800">{data.msg}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white flex flex-col justify-between">
                <p className="text-[10px] font-bold text-blue-400 mb-2 uppercase">보험료 변동</p>
                <p className="text-xl font-black">{data.score >= 90 ? "-₩1,200" : "+₩0"}</p>
            </div>
        </div>

        <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detection Details</h3>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                <DetailItem icon={<Coffee className="text-orange-500" size={18} />} title="졸음운전" count={data.status === 'warning' ? "2회" : "0회"} desc="눈 감음 지속 감지" />
                <DetailItem icon={<Smartphone className="text-blue-500" size={18} />} title="휴대폰 조작" count={data.status === 'normal' ? "1회" : "0회"} desc="전방 주시 태만" />
            </div>
        </section>
    </div>
);

export default LogDetailPage;
