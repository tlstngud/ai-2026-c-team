import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, CheckCircle2, MapPin, Ticket, Award, Map } from 'lucide-react';
import Header from './Header';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const InsurancePage = ({ score = 85, history = [], userRegion = null }) => {
    const [discountRate, setDiscountRate] = useState(0);

    useEffect(() => {
        if (score >= 110) setDiscountRate(10);
        else if (score >= 100) setDiscountRate(5);
        else setDiscountRate(0);
    }, [score]);

    // 지자체 정보가 없으면 기본값 사용
    const region = userRegion || {
        name: '전국 공통',
        campaign: '대한민국 안전운전 챌린지',
        color: 'bg-blue-600',
        accent: 'text-blue-600',
        target: 90,
        reward: '안전운전 인증서 발급',
        bgImage: 'from-blue-900 to-slate-900',
        address: ''
    };

    const isCompleted = score >= region.target;

    // 그래프 데이터 준비 (최근 10개 기록, 최신순)
    const chartData = useMemo(() => {
        if (history.length === 0) return [];

        const sortedHistory = [...history].slice(0, 10).reverse(); // 최신이 마지막에 오도록
        return sortedHistory.map((item, index) => {
            const totalRecords = sortedHistory.length;
            const recordNumber = totalRecords - index; // 최신이 가장 큰 번호
            return {
                name: `#${recordNumber}`,
                score: item.score,
                index: index + 1
            };
        });
    }, [history]);

    return (
        <div className="min-h-full bg-[#F8FAFC] text-slate-800 font-sans">
            <Header type="insurance" discountRate={discountRate} />

            <main className="grid grid-cols-1 gap-4 p-4 sm:p-6">
                {/* 지자체 챌린지 Hero Card */}
                <div className={`relative bg-gradient-to-br ${region.bgImage} rounded-[2rem] p-6 text-white overflow-hidden shadow-xl`}>
                    <Map className="absolute right-[-20px] bottom-[-20px] text-white/5" size={140} />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`}>
                                {region.address ? 'RESIDENT VERIFIED' : 'NATIONAL CHALLENGE'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-white leading-tight mb-2">
                            {region.name}<br/>안전운전 챌린지
                        </h1>
                        {region.address && (
                            <p className="text-xs text-white/70 font-medium mt-2 flex items-center gap-1">
                                <MapPin size={12} /> {region.address}
                            </p>
                        )}
                        
                        <div className="flex justify-between items-start mt-6 mb-4">
                            <div>
                                <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Current Score</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black">{Math.floor(score)}</span>
                                    <span className="text-sm font-medium text-white/60">/ {region.target}</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-white/70">
                                <span>Progress</span>
                                <span>{isCompleted ? 'Target Reached!' : `${Math.floor((score / region.target) * 100)}%`}</span>
                            </div>
                            <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-white h-full transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (score / region.target) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reward Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Challenge Reward</h3>
                    
                    <div className="flex gap-4 items-center">
                        <div className={`w-12 h-12 rounded-full ${region.color.replace('bg-', 'bg-').replace('500', '100').replace('600', '100')} flex items-center justify-center ${region.accent}`}>
                            <Ticket size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 text-sm">{region.reward}</h4>
                            <p className="text-[10px] text-slate-500 mt-1">지자체 인증 완료 시 자동 발급</p>
                        </div>
                        {isCompleted ? (
                             <button className={`${region.color} text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg active:scale-95 transition-transform`}>
                                 받기
                             </button>
                        ) : (
                            <div className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded">
                                미달성
                            </div>
                        )}
                    </div>
                </div>

                {/* Economic Benefit Card */}
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

                <section className="bg-white rounded-2xl p-6 shadow-xl border-4 border-white overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Safety Score</p>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                                {parseFloat(score).toFixed(2)}<span className="text-base text-slate-300 ml-1 font-normal">pts</span>
                            </h2>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-xl">
                            <TrendingUp className="text-blue-600" size={20} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">
                            다음 할인까지 <span className="text-blue-600">{100 - score > 0 ? parseFloat(100 - score).toFixed(2) : 0}점</span>
                        </p>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${(score / 120) * 100}%` }}></div>
                        </div>
                    </div>
                </section>

                <div className="relative aspect-[16/9] bg-white rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                    {chartData.length > 0 ? (
                        <div className="absolute inset-0 p-4 flex flex-col bg-white/95 backdrop-blur-md">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400 font-medium uppercase">점수 추이</span>
                                <div className="bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-green-100">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                                    <span className="text-[10px] font-bold text-green-700 font-mono italic">Live</span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#9ca3af"
                                        fontSize={10}
                                        tick={{ fill: '#6b7280' }}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        stroke="#9ca3af"
                                        fontSize={10}
                                        tick={{ fill: '#6b7280' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '12px',
                                            color: '#374151'
                                        }}
                                        labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                                        formatter={(value) => [`${value}점`, '점수']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        dot={{ fill: '#6366f1', r: 4 }}
                                        activeDot={{ r: 6, fill: '#4f46e5' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <>
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium bg-white/95 backdrop-blur-md">
                                <span className="text-xs">[ 실시간 모니터링 피드 ]</span>
                            </div>
                            <div className="absolute top-3 right-3 bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-green-100">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                                <span className="text-[10px] font-bold text-green-700 font-mono italic">Live</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Notice */}
                {region.address && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="text-slate-400 mt-0.5" size={16} />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-700">인증 및 할인 안내</p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    {region.name} 주민센터 및 협약 보험사를 통해 혜택을 받으실 수 있습니다. 
                                    목표 점수 달성 후 '받기' 버튼을 눌러 인증서를 발급받으세요.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default InsurancePage;
