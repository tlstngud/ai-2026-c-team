import React, { useState } from 'react';
import { User, Wallet, Calculator, QrCode, X, Search, Filter, AlertCircle, Car, Shield, Gift, Award, TrendingUp, Calendar } from 'lucide-react';
import Header from './Header';

const MyPage = ({ user, score, history, userRegion, coupons = [] }) => {
    // --- State ---
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, VOUCHER, PARKING, OIL
    const [selectedCoupon, setSelectedCoupon] = useState(null);

    // --- Data ---
    const username = user?.name || '김운전';
    const totalDistance = history.reduce((acc, curr) => acc + (curr.distance || 0), 0);

    // 콜드 스타트 처리: 최소 7개 기록 필요
    const MIN_RECORDS_FOR_SCORE = 7;
    const isAnalyzing = history.length < MIN_RECORDS_FOR_SCORE;
    const hasNoData = history.length === 0;

    // 등급 계산 (거리 + 점수 복합 평가)
    const getTier = (dist, score) => {
        if (dist < 50) {
            return { name: 'Starter', level: 0, nextGoal: 50 - dist, color: 'gray', displayName: '스타터' };
        }
        if (dist < 300 || (score !== null && score < 70)) {
            return { name: 'Bronze', level: 1, nextGoal: 300 - dist, color: 'orange', displayName: '브론즈' };
        }
        if (dist < 1000 || (score !== null && score < 85)) {
            return { name: 'Silver', level: 2, nextGoal: 1000 - dist, color: 'slate', displayName: '실버' };
        }
        if (dist < 3000 || (score !== null && score < 95)) {
            return { name: 'Gold', level: 3, nextGoal: 3000 - dist, color: 'yellow', displayName: '골드' };
        }
        return { name: 'Master', level: 4, nextGoal: 0, color: 'purple', displayName: '마스터' };
    };

    const currentTier = getTier(totalDistance, score);
    const userGrade = hasNoData
        ? '첫 주행을 시작해보세요!'
        : `${userRegion?.name || '전국'} ${currentTier.displayName} 드라이버`;

    // --- Simulation Data ---
    // 할인율 계산 (InsurancePage와 동일한 로직)
    const calculateDiscountRate = (score) => {
        if (score >= 110) return 10;
        else if (score >= 100) return 5;
        else return 0;
    };

    // 평균 점수 계산
    // 7개 미만: 전체 기록의 평균 점수
    // 7개 이상: 최근 7개 기록의 평균 점수
    const calculateAvgScore = () => {
        if (history.length === 0) return score; // score prop 사용

        const recordsToUse = history.length < MIN_RECORDS_FOR_SCORE
            ? history  // 전체 기록 사용
            : history.slice(0, 7);  // 최근 7개만 사용

        const sum = recordsToUse.reduce((acc, curr) => acc + (curr.score || 0), 0);
        return Math.floor(sum / recordsToUse.length);
    };

    // 점수 계산: 7개 미만이면 전체 기록 평균, 7개 이상이면 최근 7개 평균
    const calculatedScore = calculateAvgScore();
    const safetyScore = calculatedScore !== null && calculatedScore !== undefined ? Math.floor(calculatedScore) : null;

    const discountRate = calculateDiscountRate(safetyScore);
    const monthlySavings = discountRate * 1250; // InsurancePage와 동일한 계산

    const currentMonthData = {
        month: new Date().getMonth() + 1,
        driveTime: 8.5,
        avgScore: safetyScore,
        isAchieved: false
    };

    const avgScore = calculateAvgScore();
    const lastYearDiscount = calculateDiscountRate(avgScore - 5); // 작년은 현재보다 5점 낮았다고 가정
    const expectedDiscount = calculateDiscountRate(avgScore);

    const annualReportData = {
        monthsActive: Math.min(history.length, 12), // 기록 개수로 계산 (최대 12개월)
        avgScore: avgScore,
        tier: expectedDiscount >= 10 ? "Gold" : expectedDiscount >= 5 ? "Silver" : "Bronze",
        renewalDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0].replace(/-/g, '-'),
        lastYearDiscount: lastYearDiscount,
        expectedDiscount: expectedDiscount
    };

    const monthlyProgress = Math.min((currentMonthData.driveTime / 10) * 100, 100);

    // [2026-01-16 수정] 시뮬레이션용 기본 쿠폰 데이터 (항상 표시)
    const simulationCoupons = [
        {
            id: 'sim_1',
            type: 'VOUCHER',
            name: '춘천사랑 상품권',
            amount: '10,000원',
            provider: '춘천시청',
            status: 'AVAILABLE',
            expiry: '2026.12.31',
            theme: 'emerald'
        },
        {
            id: 'sim_2',
            type: 'PARKING',
            name: '공영주차장 50% 할인권',
            amount: '50% 할인',
            provider: '시설관리공단',
            status: 'AVAILABLE',
            expiry: '2026.06.30',
            theme: 'indigo'
        },
        {
            id: 'sim_3',
            type: 'OIL',
            name: 'SK엔크린 주유 할인권',
            amount: '3,000원',
            provider: 'SK에너지',
            status: 'USED',
            expiry: '2025.12.31',
            theme: 'orange'
        },
        {
            id: 'sim_4',
            type: 'VOUCHER',
            name: '스타벅스 아메리카노',
            amount: '1잔',
            provider: '안전운전 캠페인',
            status: 'EXPIRED',
            expiry: '2025.11.30',
            theme: 'green'
        }
    ];

    // [2026-01-16 수정] 실제 쿠폰과 시뮬레이션 쿠폰 병합 (실제 쿠폰이 위로 오도록)
    const allCoupons = [...coupons, ...simulationCoupons];

    const filteredCoupons = activeTab === 'ALL'
        ? allCoupons
        : allCoupons.filter(c => c.type === activeTab);

    // --- Styles Helpers ---
    const getStatusStyle = (status) => {
        switch (status) {
            case 'AVAILABLE': return "bg-blue-50 text-blue-600";
            case 'USED': return "bg-gray-100 text-gray-500";
            case 'EXPIRED': return "bg-red-50 text-red-500";
            default: return "";
        }
    };

    const getThemeColor = (theme) => {
        const colors = {
            emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
            indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50' },
            orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
            green: { bg: 'bg-green-600', text: 'text-green-700', light: 'bg-green-50' },
        };
        return colors[theme] || colors.indigo;
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] pb-32 font-sans text-slate-900 selection:bg-indigo-100">
            <Header type="mypage" />

            <main className="px-5 pt-6 space-y-8 max-w-md mx-auto">

                {/* 1. Profile Section (Clean & Minimal) */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center relative">
                            <User size={32} className="text-slate-300" />
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full flex items-center justify-center">
                                <Shield size={10} className="text-white" fill="currentColor" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{username}님</h2>
                            <p className="text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                {!hasNoData && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${currentTier.color === 'yellow' ? 'bg-yellow-500' :
                                        currentTier.color === 'slate' ? 'bg-slate-400' :
                                            currentTier.color === 'orange' ? 'bg-orange-500' :
                                                currentTier.color === 'purple' ? 'bg-purple-500' :
                                                    'bg-emerald-500'
                                        }`}></span>
                                )}
                                {userGrade}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Total Distance</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-900 tracking-tight">{totalDistance.toLocaleString()}</span>
                                <span className="text-sm font-medium text-slate-400">km</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Safety Score</p>
                            {hasNoData ? (
                                // CASE 1: 기록 아예 없음 (가입 직후)
                                <div className="flex flex-col items-start gap-1">
                                    <span className="text-2xl font-bold text-slate-300">--</span>
                                    <span className="text-xs text-slate-400">첫 주행을 시작해보세요!</span>
                                </div>
                            ) : isAnalyzing ? (
                                // CASE 2: 기록은 있으나 분석 기준 미달 (7개 미만)
                                <div className="flex flex-col items-start gap-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-bold tracking-tight ${safetyScore >= 90 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {safetyScore}
                                        </span>
                                        <span className="text-sm font-medium text-slate-400">pts</span>
                                    </div>
                                    <span className="text-xs text-blue-500 font-medium">
                                        분석 중... ({history.length}/{MIN_RECORDS_FOR_SCORE}개 기록)
                                    </span>
                                </div>
                            ) : (
                                // CASE 3: 정상 점수 노출 (7개 이상)
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-bold tracking-tight ${safetyScore >= 90 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {safetyScore}
                                        </span>
                                        <span className="text-sm font-medium text-slate-400">pts</span>
                                    </div>
                                    {/* 다음 등급 동기 부여 */}
                                    {currentTier.nextGoal > 0 && (
                                        <p className="text-[10px] text-slate-400">
                                            다음 등급까지 <span className="font-bold text-slate-600">{currentTier.nextGoal}km</span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 2. Monthly Challenge (Progress Card) */}
                <section className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] border border-slate-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {currentMonthData.month}월 챌린지
                                </h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">
                                    목표까지 <span className="text-indigo-600 font-bold">{10 - currentMonthData.driveTime}시간</span> 남았습니다
                                </p>
                            </div>
                            <div className="bg-slate-100 px-3 py-1.5 rounded-full">
                                <span className="text-xs font-bold text-slate-600">
                                    {monthlyProgress}%
                                </span>
                            </div>
                        </div>

                        {/* Custom Progress Bar */}
                        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                            <div
                                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${monthlyProgress}%` }}
                            ></div>
                        </div>

                        <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100/50">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <Gift size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-indigo-900">달성 보상</p>
                                <p className="text-[11px] font-medium text-indigo-600/80">춘천사랑상품권 5,000원</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Insurance Report (Dark Theme Card) */}
                <section className="bg-slate-900 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl shadow-slate-200">
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/10 rounded-lg">
                                    <Calculator size={16} className="text-emerald-400" />
                                </div>
                                <span className="text-sm font-bold text-slate-200">2026 예상 리포트</span>
                            </div>
                            <span className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded text-slate-300 border border-white/5">
                                PREMIUM TIER
                            </span>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-slate-400 mb-1">예상 할인율</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-4xl font-bold tracking-tight text-white">
                                    {annualReportData.expectedDiscount}%
                                </h3>
                                {annualReportData.expectedDiscount > annualReportData.lastYearDiscount && (
                                    <span className="text-sm font-medium text-emerald-400 mb-1.5 flex items-center gap-1">
                                        <TrendingUp size={14} /> +{annualReportData.expectedDiscount - annualReportData.lastYearDiscount}% 상승
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                예상 절감액 (월): ₩{monthlySavings.toLocaleString()}
                            </p>
                        </div>

                        <div className="grid grid-cols-12 gap-1 h-1.5 w-full mb-4">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`col-span-1 rounded-full ${i < annualReportData.monthsActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                ></div>
                            ))}
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>유지 기간: {annualReportData.monthsActive}개월</span>
                            <span>갱신: {annualReportData.renewalDate}</span>
                        </div>
                    </div>

                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                </section>

                {/* 4. Coupon Wallet */}
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Wallet className="text-slate-400" size={20} />
                            내 지갑
                        </h3>
                    </div>

                    {/* Minimal Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide -mx-1 px-1">
                        {[
                            { id: 'ALL', label: '전체' },
                            { id: 'VOUCHER', label: '상품권' },
                            { id: 'PARKING', label: '주차' },
                            { id: 'OIL', label: '주유' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all border ${activeTab === tab.id
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {filteredCoupons.length > 0 ? filteredCoupons.map(coupon => {
                            const theme = getThemeColor(coupon.theme);
                            return (
                                <div
                                    key={coupon.id}
                                    onClick={() => setSelectedCoupon(coupon)}
                                    className={`bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer ${coupon.status !== 'AVAILABLE' ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl ${theme.light} flex items-center justify-center`}>
                                                <TicketIcon type={coupon.type} className={theme.text} size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{coupon.provider}</p>
                                                <h4 className="text-sm font-bold text-slate-900">{coupon.name}</h4>
                                            </div>
                                        </div>
                                        {coupon.status !== 'AVAILABLE' && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusStyle(coupon.status)}`}>
                                                {coupon.status === 'USED' ? '사용완료' : '만료됨'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-end justify-between">
                                        <p className={`text-lg font-bold ${coupon.status === 'AVAILABLE' ? 'text-slate-900' : 'text-slate-400'}`}>
                                            {coupon.amount}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                            {coupon.expiry} 까지
                                        </p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                                <Wallet size={48} className="mb-3 opacity-20" />
                                <p className="text-xs font-medium">사용 가능한 쿠폰이 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Modal */}
            {selectedCoupon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                    <div
                        className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedCoupon(null)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 pt-12 flex flex-col items-center text-center">
                            <div className={`w-16 h-16 rounded-2xl ${getThemeColor(selectedCoupon.theme).light} flex items-center justify-center mb-6`}>
                                <TicketIcon type={selectedCoupon.type} className={getThemeColor(selectedCoupon.theme).text} size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2 w-3/4 leading-tight">
                                {selectedCoupon.name}
                            </h3>
                            <p className="text-sm font-medium text-slate-500 mb-8">
                                {selectedCoupon.provider} 제공
                            </p>

                            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-6">
                                {selectedCoupon.status === 'AVAILABLE' ? (
                                    <>
                                        <div className="flex justify-center mb-4">
                                            <QrCode size={140} className="text-slate-900" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 tracking-widest font-mono">
                                            1234 5678 9101
                                        </p>
                                    </>
                                ) : (
                                    <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                                        <AlertCircle size={40} className="mb-2 opacity-50" />
                                        <p className="text-xs font-bold">사용할 수 없는 쿠폰입니다</p>
                                    </div>
                                )}
                            </div>

                            {selectedCoupon.status === 'AVAILABLE' && (
                                <p className="text-xs text-slate-400 flex items-center gap-1.5 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    직원에게 이 화면을 보여주세요
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* --- Helper Component: Dynamic Icons --- */
const TicketIcon = ({ type, className, size = 20 }) => {
    switch (type) {
        case 'VOUCHER': return <Gift size={size} className={className} />;
        case 'PARKING': return <Car size={size} className={className} />;
        case 'OIL': return <TrendingUp size={size} className={className} />; // Or a Drop icon if available
        default: return <Award size={size} className={className} />;
    }
};

export default MyPage;
