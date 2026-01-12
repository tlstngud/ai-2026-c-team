import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, DollarSign, CheckCircle2, User } from 'lucide-react';

const InsurancePage = ({ score = 85 }) => {
    const [discountRate, setDiscountRate] = useState(0);

    useEffect(() => {
        if (score >= 110) setDiscountRate(10);
        else if (score >= 100) setDiscountRate(5);
        else setDiscountRate(0);
    }, [score]);

    return (
        <div className="min-h-full bg-[#F8FAFC] text-slate-800 p-4 sm:p-6 font-sans">
            <header className="flex justify-between items-center gap-4 mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-md">
                        <ShieldCheck className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 leading-none">Smart Mobility</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tighter">UBI System</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                    <div className="px-2 border-r border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400">적용 할인율</p>
                        <p className="text-base font-black text-blue-600">{discountRate}%</p>
                    </div>
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-slate-400" />
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 gap-4">
                <div className="relative aspect-[16/9] bg-slate-900 rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-medium">
                        <span className="text-xs">[ 실시간 모니터링 피드 ]</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                        <span className="text-[10px] font-bold text-slate-700 font-mono italic">Live</span>
                    </div>
                </div>

                <section className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-900/5 border border-blue-50 border-b-4 border-b-blue-600">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Safety Score</p>
                            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                                {score}<span className="text-lg text-slate-300 ml-1 font-normal">pts</span>
                            </h2>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-xl">
                            <TrendingUp className="text-blue-600" size={20} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">
                            다음 할인까지 <span className="text-blue-600">{100 - score > 0 ? 100 - score : 0}점</span>
                        </p>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${(score / 120) * 100}%` }}></div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <DollarSign className="absolute -right-4 -bottom-4 text-white/5" size={80} />
                    <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">Economic Benefit</h3>
                    <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <span className="text-slate-400 text-xs italic font-medium">예상 절감액 (월)</span>
                            <span className="text-xl font-bold font-mono">₩{(discountRate * 1250).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl">
                            <CheckCircle2 className="text-green-400 shrink-0" size={16} />
                            <p className="text-[10px] leading-relaxed text-slate-300 font-medium font-mono">
                                갱신 시 <span className="text-white font-bold">{discountRate}% 할인</span> 자동 적용.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default InsurancePage;
