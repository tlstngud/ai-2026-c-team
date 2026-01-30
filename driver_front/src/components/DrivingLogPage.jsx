import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import * as drivingService from '../services/drivingService';
import { enrichLogWithFormattedDate } from '../utils/dateFormatter';

const LogEntry = ({ date, formattedDate, formattedTime, score, msg, status }) => {
    // 날짜가 포맷팅되지 않은 경우 직접 포맷팅
    const displayDate = formattedDate || (date ? new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\./g, '.').replace(/\s/g, '') : '');

    const displayTime = formattedTime || (date ? new Date(date).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) : '');

    return (
        <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-colors">
            <div className="flex gap-4 items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${status === 'perfect' ? 'bg-green-100 text-green-600' : status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{score}</div>
                <div>
                    <p className="text-xs font-bold text-slate-400 mb-0.5">
                        {displayDate} {displayTime}
                    </p>
                    <p className="text-sm font-bold text-slate-800">{msg}</p>
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 shrink-0" />
        </div>
    );
};

const DrivingLogPage = ({ onSelectLog }) => {
    const { user } = useAuth();
    const [userLogs, setUserLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            if (user) {
                try {
                    setIsLoading(true);
                    // Supabase에서 로그 조회
                    const logs = await drivingService.getLogs(user.id);
                    console.log('✅ 주행 기록 조회 완료 (Supabase):', logs.length);

                    // 날짜 포맷팅 정보 추가 및 기본 메시지 생성
                    const enrichedLogs = logs.map(log => {
                        const enriched = enrichLogWithFormattedDate(log);
                        // 기본 메시지 생성
                        if (!enriched.msg) {
                            const duration = enriched.duration || 0;
                            const events = enriched.events || 0;
                            if (events > 0) {
                                enriched.msg = `주행 ${Math.floor(duration / 60)}분 ${duration % 60}초 (이벤트 ${events}회)`;
                            } else {
                                enriched.msg = `안전 운전 ${Math.floor(duration / 60)}분 ${duration % 60}초`;
                            }
                        }
                        // 상태 설정
                        if (!enriched.status) {
                            enriched.status = enriched.score >= 90 ? 'perfect' : 'warning';
                        }
                        return enriched;
                    });
                    setUserLogs(enrichedLogs);
                } catch (error) {
                    console.error('❌ 주행 기록 조회 오류:', error);
                    setUserLogs([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setUserLogs([]);
                setIsLoading(false);
            }
        };
        loadLogs();
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
                            <div key={log.logId || log.id} onClick={() => onSelectLog(log)} className="cursor-pointer">
                                <LogEntry
                                    date={log.date}
                                    formattedDate={log.formattedDate}
                                    formattedTime={log.formattedTime}
                                    score={log.score}
                                    msg={log.msg || `주행 기록 (${log.duration || 0}초)`}
                                    status={log.status || (log.score >= 90 ? 'perfect' : 'warning')}
                                />
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
