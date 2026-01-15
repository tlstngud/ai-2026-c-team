import React, { useState } from 'react';
import {
    ChevronLeft, MapPin, Calendar, Clock, AlertCircle,
    CheckCircle2, Trophy, ArrowRight, ShieldCheck, Users
} from 'lucide-react';

const ChallengeDetail = ({ challenge, onBack, currentScore = 0 }) => {
    // 참여 여부 상태 (실제로는 API나 상태 관리에서 가져와야 함)
    const [isJoined, setIsJoined] = useState(false);

    // challenge가 없으면 기본값 사용
    const challengeData = challenge || {
        id: 1,
        region: '전국 공통',
        title: '안전운전 챌린지',
        subtitle: '안전한 운전을 위한 약속',
        period: '2026.01.15 ~ 2026.01.29 (2주)',
        participants: 1243,
        targetScore: 90,
        myScore: currentScore,
        description: '지정된 기간 동안 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.',
        reward: '안전운전 인증서 발급',
        rules: [
            '지정된 기간 동안 50km 이상 주행',
            '안전운전 점수 90점 이상 유지',
            '급가속/급감속 최소화'
        ],
        conditions: [
            '최근 1년 내 중과실 사고 이력 없음',
            '마케팅 활용 동의 필수'
        ],
        theme: {
            bg: 'bg-[#F9FAFB]',
            accent: 'text-emerald-600',
            button: 'bg-emerald-600',
            gradient: 'from-emerald-500/10 to-teal-500/10',
            iconBg: 'bg-emerald-100'
        }
    };

    // 테마 설정 (region에 따라 동적으로 변경 가능)
    const getTheme = () => {
        if (challengeData.region?.includes('춘천')) {
            return {
                bg: 'bg-[#F9FAFB]',
                accent: 'text-emerald-600',
                button: 'bg-emerald-600',
                gradient: 'from-emerald-500/10 to-teal-500/10',
                iconBg: 'bg-emerald-100'
            };
        } else if (challengeData.region?.includes('서울')) {
            return {
                bg: 'bg-[#F9FAFB]',
                accent: 'text-indigo-600',
                button: 'bg-indigo-600',
                gradient: 'from-indigo-500/10 to-blue-500/10',
                iconBg: 'bg-indigo-100'
            };
        }
        return {
            bg: 'bg-[#F9FAFB]',
            accent: 'text-blue-600',
            button: 'bg-blue-600',
            gradient: 'from-blue-500/10 to-slate-500/10',
            iconBg: 'bg-blue-100'
        };
    };

    const theme = getTheme();

    // --- Handlers ---
    const handleJoin = () => {
        setIsJoined(true);
        // localStorage 기반: 챌린지 참여 상태는 localStorage에 저장됨
    };

    const myScore = isJoined ? challengeData.myScore : 0;
    const progress = myScore > 0 ? Math.min(100, (myScore / challengeData.targetScore) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-white font-sans text-slate-900 z-[100] overflow-y-auto">
            {/* 1. Header (Floating) - Slide from top */}
            <header className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-sm font-bold text-slate-800">
                    챌린지 상세
                </span>
                <button className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
                    <AlertCircle size={20} />
                </button>
            </header>

            {/* Main Content - Slide Up from bottom */}
            <main className="px-6 pt-20 pb-32 relative z-[100] animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0">

                {/* 2. Hero Section - Staggered Animation */}
                <div className="mb-8 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.1s_forwards]">
                    <div className="flex items-center gap-2 mb-3 opacity-0 animate-[fadeInUp_0.5s_ease-out_0.2s_forwards]">
                        <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <MapPin size={10} /> {challengeData.region || '전국 공통'}
                        </span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Users size={10} /> {challengeData.participants?.toLocaleString() || '1,243'}명 참여 중
                        </span>
                    </div>

                    <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.3s_forwards]">
                        {challengeData.title || challengeData.campaign || '안전운전 챌린지'}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed opacity-0 animate-[fadeInUp_0.5s_ease-out_0.4s_forwards]">
                        {challengeData.description || challengeData.subtitle || '지정된 기간 동안 안전운전을 실천해주세요.'}
                    </p>
                </div>

                {/* 3. Score & Status Card (Dynamic) - Scale Effect */}
                <section className={`relative rounded-[2rem] overflow-hidden p-6 mb-8 border border-white shadow-xl shadow-slate-200/60 opacity-0 animate-[fadeInScale_0.7s_ease-out_0.5s_forwards]`}>
                    {/* Background Art */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} z-0`}></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <div className="relative z-10">
                        {isJoined ? (
                            // CASE A: 참여 중 (내 점수 표시)
                            <>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">My Score</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`text-5xl font-black ${theme.accent}`}>
                                                {Math.floor(myScore)}
                                            </span>
                                            <span className="text-sm font-bold text-slate-400">/ {challengeData.targetScore}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-600">
                                            상위 12%
                                        </span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>현재 달성률</span>
                                        <span>{Math.floor(progress)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-white/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${theme.button} transition-all duration-1000`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 pt-1">
                                        * 매일 자정 업데이트 됩니다.
                                    </p>
                                </div>
                            </>
                        ) : (
                            // CASE B: 참여 전 (목표 및 혜택 강조)
                            <div className="text-center py-4">
                                <div className={`w-14 h-14 mx-auto rounded-2xl ${theme.iconBg} flex items-center justify-center mb-4 shadow-sm`}>
                                    <Trophy size={28} className={theme.accent} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">
                                    목표 점수 <span className={theme.accent}>{challengeData.targetScore}점</span> 달성 시
                                </h3>
                                <p className="text-2xl font-black text-slate-800 mb-6">
                                    {challengeData.reward || '혜택 제공'}
                                </p>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/60 rounded-lg text-[10px] font-bold text-slate-500 border border-white/50">
                                    <Clock size={10} />
                                    남은 기간: 14일
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. Info Grid - Staggered */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="opacity-0 animate-[fadeInUp_0.5s_ease-out_0.7s_forwards]">
                        <InfoBox
                            icon={<Calendar size={18} />}
                            label="진행 기간"
                            value="2주간"
                            sub={challengeData.period || '2026.01.15 ~ 2026.01.29'}
                        />
                    </div>
                    <div className="opacity-0 animate-[fadeInUp_0.5s_ease-out_0.8s_forwards]">
                        <InfoBox
                            icon={<ShieldCheck size={18} />}
                            label="인증 방식"
                            value="자동 측정"
                            sub="앱 내 주행 기록"
                        />
                    </div>
                </div>

                {/* 5. Rules & Conditions - Staggered */}
                <section className="space-y-6">
                    <div className="opacity-0 animate-[fadeInUp_0.6s_ease-out_0.9s_forwards]">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <div className="w-1 h-4 bg-slate-900 rounded-full"></div>
                            달성 조건 (Rules)
                        </h3>
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                            {(challengeData.rules || [
                                '지정된 기간 동안 100km 이상 주행',
                                '안전운전 점수 90점 이상 유지',
                                '급가속/급감속 최소화'
                            ]).map((rule, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-5 h-5 rounded-full ${theme.iconBg} flex items-center justify-center shrink-0`}>
                                        <span className={`text-[10px] font-bold ${theme.accent}`}>{idx + 1}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 leading-snug">{rule}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="opacity-0 animate-[fadeInUp_0.6s_ease-out_1.0s_forwards] mb-24">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <div className="w-1 h-4 bg-slate-200 rounded-full"></div>
                            참여 대상
                        </h3>
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-xs font-medium text-slate-500 leading-relaxed">
                            <ul className="list-disc pl-4 space-y-1">
                                {(challengeData.conditions || [
                                    '최근 1년 내 중과실 사고 이력 없음',
                                    '마케팅 활용 동의 필수'
                                ]).map((cond, idx) => (
                                    <li key={idx}>{cond}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

            </main>

            {/* 6. Sticky Footer Action - Slide Up */}
            <div className="fixed bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-white via-white to-transparent z-[180] opacity-0 animate-[slideUpFade_0.5s_ease-out_1.1s_forwards]">
                <button
                    onClick={isJoined ? () => { } : handleJoin}
                    disabled={isJoined && myScore < challengeData.targetScore}
                    className={`w-full h-14 rounded-[1.2rem] flex items-center justify-center gap-2 text-lg font-bold shadow-xl shadow-slate-200 transition-all active:scale-95
                        ${isJoined
                            ? 'bg-slate-900 text-white cursor-default'
                            : `${theme.button} text-white hover:opacity-90`
                        }`}
                >
                    {isJoined ? (
                        <>
                            <CheckCircle2 size={20} /> 참여 중입니다
                        </>
                    ) : (
                        <>
                            챌린지 시작하기 <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// --- Helper Component ---
const InfoBox = ({ icon, label, value, sub }) => (
    <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm">
        <div className="text-slate-400 mb-2">{icon}</div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">{sub}</p>
    </div>
);

export default ChallengeDetail;
