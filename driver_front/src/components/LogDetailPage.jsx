import React, { useEffect, useState } from 'react';
import { ChevronLeft, Clock, MapPin, Coffee, Smartphone, Zap, AlertTriangle, Sparkles } from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';
import { assessDrivingLog } from '../services/geminiService';

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

const LogDetailPage = ({ data, onBack }) => {
    // 날짜 포맷팅
    const dateInfo = formatDate(data.date || data.dateDisplay);
    const displayDate = dateInfo.date || (data.formattedDate || '');
    const displayTime = dateInfo.time || (data.formattedTime || '');
    const displayDateTime = dateInfo.dateTime || `${displayDate} ${displayTime}`;

    // 시간 포맷팅 (duration을 분:초로 변환)
    const formatDuration = (seconds) => {
        if (!seconds) return '0분';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
    };

    // 거리 포맷팅
    const formatDistance = (distance) => {
        if (!distance || distance === 0) return '0km';
        return `${distance.toFixed(1)}km`;
    };

    // AI 평가 상태
    const [evaluation, setEvaluation] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // AI 평가 호출
    useEffect(() => {
        const fetchEvaluation = async () => {
            try {
                setIsLoading(true);
                const result = await assessDrivingLog(data);
                setEvaluation(result);
            } catch (err) {
                console.error(err);
                setError(err.message || '평가를 불러오지 못했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        if (data) {
            fetchEvaluation();
        }
    }, [data]);

    return (
        <div className="animate-in slide-in-from-right duration-500 bg-white min-h-full">
            <div className="px-6 pt-6 pb-4 bg-white/90 backdrop-blur-xl z-30 sticky top-0 border-b border-gray-100 shadow-sm">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold mb-4 hover:text-slate-900 transition-colors">
                    <ChevronLeft size={20} />
                    <span className="text-sm">뒤로가기</span>
                </button>

                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">
                            {displayDate || '주행 기록'} <span className="text-base font-normal text-slate-400 italic">Report</span>
                        </h1>
                        {displayTime && (
                            <p className="text-sm text-slate-500 mt-1">{displayTime}</p>
                        )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-black ${data.status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {data.score} PTS
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(data.duration || data.time)}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {formatDistance(data.distance)}</span>
                </div>
            </div>

            <div className="p-6 pt-6 grid grid-cols-1 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">운행 거리</p>
                            <p className="text-2xl font-black text-slate-800">{formatDistance(data.distance)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">안전 운전 시간</p>
                            <p className="text-2xl font-black text-slate-800">{formatDuration(data.duration)}</p>
                        </div>
                    </div>
                </div>

                {/* AI 주행 평가 섹션 */}
                <section className="space-y-4 mt-4">
                    <div className="flex items-center gap-2 ml-1">
                        <Sparkles className="text-purple-500" size={16} />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">주행 기록 평가</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        {isLoading ? (
                            <div className="min-h-[100px] flex flex-col items-center justify-center text-slate-400 text-sm font-medium gap-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                                AI 주행 코치가 데이터를 분석 중입니다...
                            </div>
                        ) : error ? (
                            <div className="text-red-500 text-sm p-4 text-center bg-red-50 rounded-xl">
                                {error}
                                <br />
                                <span className="text-xs text-red-400 mt-1 block">API 키를 확인해주세요.</span>
                            </div>
                        ) : (
                            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                                {evaluation}
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-4 mt-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detection Details</h3>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                        <DetailItem
                            icon={<Coffee className="text-orange-500" size={18} />}
                            title="졸음운전"
                            count={`${data.drowsyCount || 0}회`}
                            desc="눈 감음 지속 감지"
                        />
                        <DetailItem
                            icon={<Smartphone className="text-blue-500" size={18} />}
                            title="휴대폰 조작"
                            count={`${data.phoneCount || 0}회`}
                            desc="전방 주시 태만"
                        />
                        <DetailItem
                            icon={<Zap className="text-yellow-500" size={18} />}
                            title="급가속"
                            count={`${data.gpsEvents?.hardAccel || 0}회`}
                            desc="급격한 속도 증가"
                        />
                        <DetailItem
                            icon={<AlertTriangle className="text-red-500" size={18} />}
                            title="급감속"
                            count={`${data.gpsEvents?.hardBrake || 0}회`}
                            desc="급격한 속도 감소"
                        />
                        {data.gpsEvents?.overspeed > 0 && (
                            <DetailItem
                                icon={<MapPin className="text-red-500" size={18} />}
                                title="과속"
                                count={`${data.gpsEvents.overspeed}회`}
                                desc="제한 속도 초과"
                            />
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default LogDetailPage;
