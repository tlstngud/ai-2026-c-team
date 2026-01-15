import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, CheckCircle2, MapPin, Ticket, Award, Map } from 'lucide-react';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChallengeDetail from './ChallengeDetail';
import { storage } from '../utils/localStorage';

const InsurancePage = ({ score = 85, history = [], userRegion = null, onShowChallengeDetail = null, onClaimReward = null, showChallengeDetail = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [discountRate, setDiscountRate] = useState(0);
    const [isRewardClaimed, setIsRewardClaimed] = useState(false);
    const [showRewardCard, setShowRewardCard] = useState(false); // [2026-01-15 수정] 초기 상태 false로 변경 (챌린지 시작 전 숨김)
    const [isChallengeJoined, setIsChallengeJoined] = useState(false); // [2026-01-15 수정] 챌린지 참여 상태 추가 (상세 화면 닫혀도 유지)
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);

    // [2026-01-16 수정] 챌린지 시작/취소 토글 핸들러 (localStorage 연동)
    const handleChallengeStart = (status) => {
        if (!user) return;

        // challenge가 아직 로드되지 않았을 경우를 대비
        const currentChallengeId = challenge ? challenge.challengeId : `challenge_${region.name.replace(/\s/g, '_')}`;

        if (status) {
            storage.joinChallenge(user.id, currentChallengeId);
            setIsChallengeJoined(true);
            setShowRewardCard(true);
        } else {
            storage.leaveChallenge(user.id, currentChallengeId);
            setIsChallengeJoined(false);
            setShowRewardCard(false);
        }
    };

    // 점수 계산: 7개 미만이면 전체 기록 평균, 7개 이상이면 최근 7개 평균
    const totalDistance = history.reduce((acc, curr) => acc + (curr.distance || 0), 0);
    const MIN_RECORDS_FOR_SCORE = 7;
    const hasNoData = history.length === 0;

    // 점수 계산 로직
    const calculateDisplayScore = () => {
        if (hasNoData) return null;
        if (history.length < MIN_RECORDS_FOR_SCORE) {
            // 7개 미만: 전체 기록의 평균 점수
            const sum = history.reduce((acc, curr) => acc + (curr.score || 0), 0);
            return Math.floor(sum / history.length);
        } else {
            // 7개 이상: 최근 7개 기록의 평균 점수
            const recentHistory = history.slice(0, 7);
            const sum = recentHistory.reduce((acc, curr) => acc + (curr.score || 0), 0);
            return Math.floor(sum / recentHistory.length);
        }
    };

    const displayScore = calculateDisplayScore();
    const isAnalyzing = history.length < MIN_RECORDS_FOR_SCORE && !hasNoData; // 7개 미만일 때만 "분석 중" 표시

    // 챌린지 상세 페이지로 이동
    const handleShowChallengeDetail = () => {
        if (onShowChallengeDetail) {
            onShowChallengeDetail(true);
        }
    };

    useEffect(() => {
        if (displayScore === null) {
            setDiscountRate(0);
        } else if (displayScore >= 110) {
            setDiscountRate(10);
        } else if (displayScore >= 100) {
            setDiscountRate(5);
        } else {
            setDiscountRate(0);
        }
    }, [displayScore]);

    // 챌린지 정보 localStorage에서 불러오기
    useEffect(() => {
        const loadChallenge = () => {
            try {
                const challenges = storage.getChallenges();

                if (userRegion?.name) {
                    // 지역에 맞는 챌린지 찾기
                    const matchedChallenge = challenges.find(c =>
                        c.region === userRegion.name ||
                        userRegion.name.includes(c.region) ||
                        c.region.includes(userRegion.name)
                    );

                    if (matchedChallenge) {
                        setChallenge(matchedChallenge);
                    } else {
                        // 매칭되는 챌린지가 없으면 기본 챌린지 사용
                        const defaultChallenge = challenges.find(c => c.region === '전국 공통') || challenges[0];
                        if (defaultChallenge) {
                            setChallenge(defaultChallenge);
                        }
                    }
                } else {
                    // userRegion이 없으면 기본 챌린지 사용
                    const defaultChallenge = challenges.find(c => c.region === '전국 공통') || challenges[0];
                    if (defaultChallenge) {
                        setChallenge(defaultChallenge);
                    }
                }
            } catch (error) {
                console.error('챌린지 정보 로드 오류:', error);
            } finally {
                setLoading(false);
            }
        };
        loadChallenge();
    }, [userRegion]);

    // [2026-01-16 추가] 챌린지 참여 상태 동기화
    useEffect(() => {
        if (user && (challenge || userRegion)) {
            // challenge가 없으면 userRegion으로 임시 ID 생성해서 체크
            const currentChallengeId = challenge ? challenge.challengeId : `challenge_${region.name.replace(/\s/g, '_')}`;
            const status = storage.getChallengeStatus(user.id, currentChallengeId);

            if (status) {
                // 이미 참여 중
                if (status.status === 'REWARD_CLAIMED') {
                    setIsChallengeJoined(true);
                    setIsRewardClaimed(true);
                    setShowRewardCard(false); // 이미 받았으면 숨김
                } else {
                    setIsChallengeJoined(true);
                    setIsRewardClaimed(false);
                    setShowRewardCard(true); // 진행 중이면 표시
                }
            } else {
                setIsChallengeJoined(false);
                setShowRewardCard(false);
            }
        }
    }, [user, challenge, userRegion]);

    // 지자체 정보가 없으면 기본값 사용
    const region = challenge && challenge.region ? {
        name: challenge.region,
        campaign: challenge.name,
        color: challenge.region.includes('춘천') ? 'bg-emerald-500' : challenge.region.includes('서울') ? 'bg-indigo-600' : 'bg-blue-600',
        accent: challenge.region.includes('춘천') ? 'text-emerald-600' : challenge.region.includes('서울') ? 'text-indigo-600' : 'text-blue-600',
        target: challenge.targetScore,
        reward: challenge.reward,
        bgImage: challenge.region.includes('춘천') ? 'from-emerald-900 to-slate-900' : challenge.region.includes('서울') ? 'from-indigo-900 to-slate-900' : 'from-blue-900 to-slate-900',
        address: userRegion?.address || ''
    } : (userRegion || {
        name: '전국 공통',
        campaign: '대한민국 안전운전 챌린지',
        color: 'bg-blue-600',
        accent: 'text-blue-600',
        target: 90,
        reward: '안전운전 인증서 발급',
        bgImage: 'from-blue-900 to-slate-900',
        address: ''
    });

    const isCompleted = displayScore !== null && displayScore >= region.target;

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

    // 챌린지 상세 페이지 표시 (조건부 렌더링)
    if (showChallengeDetail) {
        // challenge가 없어도 region 정보를 기반으로 기본 챌린지 데이터 생성
        const challengeData = challenge || {
            challengeId: `challenge_${region.name.replace(/\s/g, '_')}`,
            region: region.name,
            name: region.campaign,
            title: `${region.name} 안전운전 챌린지`,
            targetScore: region.target,
            reward: region.reward,
            participants: 0,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14일 후
            description: `${region.name}에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.`,
            rules: ['지정된 기간 동안 안전운전 실천', `안전운전 점수 ${region.target}점 이상 유지`, '급가속/급감속 최소화'],
            conditions: [`${region.name} 거주자 또는 주 활동 운전자`, '최근 1년 내 중과실 사고 이력 없음', '마케팅 활용 동의 필수']
        };

        return (
            <ChallengeDetail
                challenge={{
                    region: challengeData.region,
                    title: challengeData.name || challengeData.title,
                    targetScore: challengeData.targetScore,
                    myScore: score,
                    reward: challengeData.reward,
                    participants: challengeData.participants || 0,
                    period: challengeData.period || `${challengeData.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]} ~ ${challengeData.endDate?.split('T')[0] || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
                    description: challengeData.description,
                    rules: challengeData.rules || [],
                    conditions: challengeData.conditions || []
                }}
                currentScore={score}
                onBack={() => {
                    if (onShowChallengeDetail) {
                        onShowChallengeDetail(false);
                    }
                }}
                onJoin={handleChallengeStart}
                isJoined={isChallengeJoined} // [2026-01-15 수정] 참여 상태 전달
                isRewardClaimed={isRewardClaimed} // [2026-01-16 추가] 보상 수령 상태 전달
            />
        );
    }

    return (
        <div className="min-h-full bg-[#F8FAFC] text-slate-800 font-sans">
            <Header type="insurance" discountRate={discountRate} />

            <main className="grid grid-cols-1 gap-4 p-4 sm:p-6 transition-all duration-500 ease-in-out">
                {/* 지자체 챌린지 Hero Card */}
                <div
                    className={`relative bg-gradient-to-br ${region.bgImage} rounded-[2rem] p-6 text-white overflow-hidden shadow-xl cursor-pointer active:scale-[0.98] transition-transform`}
                    onClick={handleShowChallengeDetail}
                >
                    <Map className="absolute right-[-20px] bottom-[-20px] text-white/5" size={140} />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`}>
                                {region.address ? 'RESIDENT VERIFIED' : 'NATIONAL CHALLENGE'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-white leading-tight mb-2">
                            {region.name}<br />안전운전 챌린지
                        </h1>
                        {region.address && (
                            <p className="text-xs text-white/70 font-medium mt-2 flex items-center gap-1">
                                <MapPin size={12} /> {region.address}
                            </p>
                        )}

                        <div className="flex justify-between items-start mt-6 mb-4">
                            <div>
                                <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Current Score</h3>
                                {hasNoData ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-3xl font-black text-white/50">--</span>
                                        <span className="text-xs text-white/50">첫 주행을 시작해보세요!</span>
                                    </div>
                                ) : isAnalyzing ? (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black">{displayScore}</span>
                                            <span className="text-sm font-medium text-white/60">/ {region.target}</span>
                                        </div>
                                        <span className="text-xs text-white/60">
                                            분석 중... ({history.length}/{MIN_RECORDS_FOR_SCORE}개 기록)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-black">{Math.floor(displayScore)}</span>
                                        <span className="text-sm font-medium text-white/60">/ {region.target}</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {!hasNoData && !isAnalyzing && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-white/70">
                                    <span>Progress</span>
                                    <span>{isCompleted ? 'Target Reached!' : `${Math.floor((displayScore / region.target) * 100)}%`}</span>
                                </div>
                                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-white h-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (displayScore / region.target) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reward Card */}
                {showRewardCard && (
                    <div
                        className={`bg-white rounded-2xl shadow-sm border border-slate-100 transition-all duration-500 ease-in-out overflow-hidden ${isRewardClaimed
                            ? 'opacity-0 -translate-y-4 max-h-0 p-0 mb-0'
                            : 'opacity-100 translate-y-0 max-h-[200px] p-6'
                            }`}
                        onTransitionEnd={() => {
                            if (isRewardClaimed) {
                                setShowRewardCard(false);
                            }
                        }}
                    >
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Challenge Reward</h3>

                        <div className="flex gap-4 items-center">
                            <div className={`w-12 h-12 rounded-full ${region.color ? region.color.replace('bg-', 'bg-').replace('500', '100').replace('600', '100') : 'bg-blue-100'} flex items-center justify-center ${region.accent || 'text-blue-600'}`}>
                                <Ticket size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900 text-sm">{region.reward}</h4>
                                <p className="text-[10px] text-slate-500 mt-1">지자체 인증 완료 시 자동 발급</p>
                            </div>
                            {isCompleted ? (
                                isRewardClaimed ? (
                                    <button
                                        disabled
                                        className="bg-slate-200 text-slate-400 text-xs font-bold px-3 py-2 rounded-xl cursor-not-allowed"
                                    >
                                        발급완료
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (onClaimReward) {
                                                // 쿠폰 데이터 생성
                                                const couponData = {
                                                    type: 'VOUCHER',
                                                    name: region.reward || '안전운전 인증서',
                                                    amount: region.reward && region.reward.includes('상품권')
                                                        ? region.reward.match(/\d+만?원/)?.[0] || '10,000원'
                                                        : region.reward && region.reward.includes('할인')
                                                            ? '50% 할인'
                                                            : region.reward || '인증서',
                                                    provider: region.name,
                                                    theme: region.color && region.color.includes('emerald') ? 'emerald'
                                                        : region.color && region.color.includes('indigo') ? 'indigo'
                                                            : 'blue',
                                                    challengeId: challenge ? challenge.challengeId : `challenge_${region.name.replace(/\s/g, '_')}`
                                                };
                                                onClaimReward(couponData);

                                                // [2026-01-16 추가] 리워드 발급 상태 저장
                                                if (user) {
                                                    const currentChallengeId = challenge ? challenge.challengeId : `challenge_${region.name.replace(/\s/g, '_')}`;
                                                    storage.claimChallengeReward(user.id, currentChallengeId);
                                                }

                                                // 2초 후에 카드가 사라지도록 설정
                                                setTimeout(() => {
                                                    setIsRewardClaimed(true);
                                                    setShowRewardCard(false);
                                                }, 2000);
                                            }
                                        }}
                                        className={`${region.color || 'bg-blue-600'} text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg active:scale-95 transition-transform`}
                                    >
                                        받기
                                    </button>
                                )
                            ) : (
                                <div className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded">
                                    미달성
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ECONOMIC BENEFIT 박스 코드 삭제됨 */}
                <section className="bg-white rounded-2xl p-6 shadow-xl border-4 border-white overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Safety Score</p>
                            {hasNoData ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-2xl font-black text-slate-300">--</span>
                                    <span className="text-xs text-slate-400">첫 주행을 시작해보세요!</span>
                                </div>
                            ) : isAnalyzing ? (
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                                        {displayScore}<span className="text-base text-slate-300 ml-1 font-normal">pts</span>
                                    </h2>
                                    <span className="text-xs text-blue-500 font-medium">
                                        분석 중... ({history.length}/{MIN_RECORDS_FOR_SCORE}개 기록)
                                    </span>
                                </div>
                            ) : (
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                                    {parseFloat(displayScore).toFixed(2)}<span className="text-base text-slate-300 ml-1 font-normal">pts</span>
                                </h2>
                            )}
                        </div>
                        <div className="bg-blue-50 p-2 rounded-xl">
                            <TrendingUp className="text-blue-600" size={20} />
                        </div>
                    </div>
                    {!hasNoData && !isAnalyzing && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-600">
                                다음 할인까지 <span className="text-blue-600">{100 - displayScore > 0 ? parseFloat(100 - displayScore).toFixed(2) : 0}점</span>
                            </p>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${(displayScore / 120) * 100}%` }}></div>
                            </div>
                        </div>
                    )}
                </section>

                <div className="relative aspect-[16/9] bg-white rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                    {chartData.length > 0 ? (
                        <div className="absolute inset-0 p-4 flex flex-col bg-white/95 backdrop-blur-md">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400 font-medium uppercase">점수 추이</span>

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
