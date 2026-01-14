import React, { useState } from 'react';
import { User, Wallet, Calculator, QrCode, X, Search, Filter, AlertCircle, Car, Shield, Gift, Award } from 'lucide-react';
import Header from './Header';


const MyPage = ({ user, score, history, userRegion }) => {
    // --- State ---
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, VOUCHER, PARKING, OIL
    const [selectedCoupon, setSelectedCoupon] = useState(null);

    // --- Data ---
    const username = user?.name || '김운전';
    const userGrade = `${userRegion?.name || '춘천'} 1등급 드라이버`;
    const totalDistance = history.reduce((acc, curr) => acc + (curr.distance || 12), 0); // distance가 없으면 임의값
    const safetyScore = Math.floor(score); // 현재 점수

    // --- Simulation Data for RewardDashboard ---
    // 실제로는 userData에서 가져와야 하지만, 시나리오를 위해 더미 데이터 정의
    const currentMonthData = {
        month: 1,
        driveTime: 8.5,
        avgScore: 92,
        isAchieved: false
    };

    const annualReportData = {
        monthsActive: 4,
        avgScore: 96,
        tier: "Gold",
        renewalDate: "2026-11-20",
        lastYearDiscount: 13,
        expectedDiscount: 15
    };

    const monthlyProgress = Math.min((currentMonthData.driveTime / 10) * 100, 100);

    // 쿠폰 더미 데이터
    const coupons = [
        {
            id: 1,
            type: 'VOUCHER',
            name: '춘천사랑 상품권',
            amount: '10,000원',
            provider: '춘천시청',
            status: 'AVAILABLE', // AVAILABLE, USED, EXPIRED
            expiry: '2026.12.31',
            color: 'bg-emerald-500',
            textColor: 'text-emerald-600',
            bgImage: 'from-emerald-500 to-teal-600'
        },
        {
            id: 2,
            type: 'PARKING',
            name: '공영주차장 50% 할인권',
            amount: '50% 할인',
            provider: '춘천시 시설관리공단',
            status: 'AVAILABLE',
            expiry: '2026.06.30',
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgImage: 'from-blue-500 to-indigo-600'
        },
        {
            id: 3,
            type: 'OIL',
            name: 'SK엔크린 주유 할인권',
            amount: '3,000원',
            provider: 'SK에너지',
            status: 'USED',
            expiry: '2025.12.31',
            color: 'bg-red-500',
            textColor: 'text-red-600',
            bgImage: 'from-red-500 to-orange-600'
        },
        {
            id: 4,
            type: 'VOUCHER',
            name: '스타벅스 아메리카노',
            amount: '1잔',
            provider: '안전운전 캠페인',
            status: 'EXPIRED',
            expiry: '2025.11.30',
            color: 'bg-green-600',
            textColor: 'text-green-700',
            bgImage: 'from-green-600 to-emerald-700'
        }
    ];

    // --- Filtering ---
    const filteredCoupons = activeTab === 'ALL'
        ? coupons
        : coupons.filter(c => c.type === activeTab);

    // --- Render Helpers ---
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">사용가능</span>;
            case 'USED': return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">사용완료</span>;
            case 'EXPIRED': return <span className="px-2 py-0.5 bg-red-100 text-red-500 text-[10px] font-bold rounded-full">기간만료</span>;
            default: return null;
        }
    };

    return (
        <div className="min-h-full bg-[#f8fafc] pb-24">
            <Header type="mypage" />

            <div className="p-4 space-y-4">
                {/* 1. 사용자 요약 (Profile) */}
                <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm">
                                <User size={28} className="text-slate-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800">{username}</h2>
                                <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">
                                    {userGrade}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Distance</p>
                                <div className="flex items-end gap-1">
                                    <span className="text-lg font-black text-slate-700">{totalDistance.toLocaleString()}</span>
                                    <span className="text-xs font-medium text-slate-400 mb-1">km</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Safety Score</p>
                                <div className="flex items-end gap-1">
                                    <span className="text-lg font-black text-slate-700">{safetyScore}</span>
                                    <span className="text-xs font-medium text-slate-400 mb-1">pts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. 경제적 이득 시뮬레이션 */}
                {/* 2. 경제적 이득 & 보상 (월간/연간 이원화) */}
                <div className="space-y-4">
                    {/* --- 상단: 월간 챌린지 (Short-term) --- */}
                    <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-slate-800 text-lg">
                                {currentMonthData.month}월 챌린지 진행 중 <span className="text-indigo-600">({monthlyProgress}%)</span>
                            </h3>
                            <div className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-1 rounded-md font-bold">
                                D-17
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">주행 시간</span>
                                <span className="font-bold text-slate-700">{currentMonthData.driveTime}h / 10h</span>
                            </div>

                            {/* 프로그레스 바 */}
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                    style={{ width: `${monthlyProgress}%` }}
                                ></div>
                            </div>

                            <p className="text-xs text-slate-400 mt-2">
                                ✨ 목표 달성 시: <span className="text-slate-700 font-bold">춘천사랑상품권 5,000원권</span> 자동 발급
                            </p>
                        </div>
                    </section>

                    {/* --- 하단: 연간 보험료 리포트 (Long-term) --- */}
                    <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Calculator size={18} className="text-emerald-500" />
                                    2026 보험료 할인 리포트
                                </h3>
                                <p className="text-2xl font-black text-emerald-600 mt-1">예상 {annualReportData.expectedDiscount}% 할인</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full uppercase tracking-widest font-bold border border-yellow-200">
                                    {annualReportData.tier} Tier
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 relative z-10">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Annual Avg Score</p>
                                    <p className="text-xl font-bold text-slate-800">{annualReportData.avgScore}점</p>
                                </div>
                                <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg">
                                    작년 대비 <span className="font-bold">{annualReportData.expectedDiscount - annualReportData.lastYearDiscount}%p 추가 절감</span> 중
                                </p>
                            </div>

                            {/* 12개월 진행률 표시 (진행률 바) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                    <span>{annualReportData.monthsActive}개월째 안전 주행 중</span>
                                    <span>최종 갱신일: {annualReportData.renewalDate}</span>
                                </div>
                                <div className="flex gap-1">
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 flex-1 rounded-full transition-colors duration-500 ${i < annualReportData.monthsActive ? 'bg-emerald-500' : 'bg-slate-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p className="text-[10px] text-center mt-4 text-slate-400 italic relative z-10 flex items-center justify-center gap-1.5">
                            <AlertCircle size={10} />
                            갱신일까지 현재 점수를 유지해야 할인이 확정됩니다.
                        </p>

                        {/* Background Effects (Subtle and Light) */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-8 -mt-8"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -ml-6 -mb-6"></div>
                    </section>
                </div>

                {/* 3. 쿠폰함 (Wallet) */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-2 rounded-xl">
                                <Wallet size={20} className="text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">내 쿠폰함</h3>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
                        {[
                            { id: 'ALL', label: '전체' },
                            { id: 'VOUCHER', label: '상품권' },
                            { id: 'PARKING', label: '주차권' },
                            { id: 'OIL', label: '주유권' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? 'bg-slate-800 text-white shadow-lg shadow-slate-200'
                                    : 'bg-white text-slate-400 border border-slate-100'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Coupon List */}
                    <div className="space-y-3">
                        {filteredCoupons.length > 0 ? filteredCoupons.map(coupon => (
                            <div
                                key={coupon.id}
                                onClick={() => setSelectedCoupon(coupon)}
                                className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer ${coupon.status !== 'AVAILABLE' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                            >
                                {/* Background Accent */}
                                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${coupon.bgImage} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>

                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block mb-1">{coupon.provider}</span>
                                        <h4 className="text-base font-bold text-slate-800">{coupon.name}</h4>
                                    </div>
                                    {renderStatusBadge(coupon.status)}
                                </div>

                                <div className="flex justify-between items-end relative z-10">
                                    <p className={`text-xl font-black ${coupon.textColor}`}>{coupon.amount}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">~ {coupon.expiry}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-xs">보유한 쿠폰이 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Modal Popup for Coupon Detail */}
            {selectedCoupon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div
                        className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`h-24 bg-gradient-to-br ${selectedCoupon.bgImage} relative p-6 flex justify-end`}>
                            <button
                                onClick={() => setSelectedCoupon(null)}
                                className="bg-black/20 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/30 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 -mt-6 bg-white rounded-t-[2rem] flex flex-col items-center text-center">
                            <div className="mb-2">
                                <span className={`px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider`}>
                                    {selectedCoupon.provider}
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-1 leading-tight w-3/4">
                                {selectedCoupon.name}
                            </h3>
                            <p className={`text-lg font-bold ${selectedCoupon.textColor} mb-8`}>
                                {selectedCoupon.amount}
                            </p>

                            {/* QR / Barcode Area */}
                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-6 w-full flex flex-col items-center">
                                {selectedCoupon.status === 'AVAILABLE' ? (
                                    <>
                                        <QrCode size={120} className="text-slate-800 mb-4" />
                                        <div className="w-full h-8 bg-slate-200 rounded-sm mb-2 relative overflow-hidden">
                                            {/* Barcode Lines Simulation */}
                                            <div className="absolute inset-0 flex justify-between px-2 items-center opacity-40">
                                                {[...Array(20)].map((_, i) => (
                                                    <div key={i} className="w-1 h-full bg-slate-800" style={{ width: Math.random() * 4 + 1 + 'px' }}></div>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold">1234 - 5678 - 9101</p>
                                    </>
                                ) : (
                                    <div className="py-8 flex flex-col items-center text-slate-400">
                                        <AlertCircle size={40} className="mb-2" />
                                        <p className="text-xs font-bold">
                                            {selectedCoupon.status === 'USED' ? '이미 사용된 쿠폰입니다.' : '기간이 만료된 쿠폰입니다.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
                                매장 계산대에 보여주세요
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPage;
