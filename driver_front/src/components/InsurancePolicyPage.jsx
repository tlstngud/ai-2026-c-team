import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

const POLICY_ITEMS = [
    { id: '1', text: '1\uB144 \uB3C4\uC548 \uC6D4\uBCC4 \uACFC\uC18D 10\uD68C \uC774\uD558 \uC2DC \uAC10\uBA74' },
    { id: '2', text: '1\uB144 \uB3C4\uC548 \uC548\uC804 \uC810\uC218 90\uC810 \uC774\uC0C1 \uC720\uC9C0 \uC2DC \uAC10\uBA74' },
    { id: '3', text: '1\uB144 \uB3C4\uC548 \uC6D4\uBCC4 \uACFC\uC18D 20\uD68C \uC774\uD558 \uC2DC \uAC10\uBA74' }
];

const InsurancePolicyPage = () => {
    const navigate = useNavigate();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const content = (
        <div className="fixed inset-0 bg-white font-sans text-slate-900 z-[99999] overflow-y-auto">
            <header className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
                    type="button"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-sm font-bold text-slate-800">insurance policy</span>
                <button className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400" type="button">
                    <AlertCircle size={20} />
                </button>
            </header>

            <main className="px-6 pt-20 pb-32 relative z-[9999] animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0">
                <div className="mb-8 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.1s_forwards]">
                    <div className="flex items-center gap-2 mb-3 opacity-0 animate-[fadeInUp_0.5s_ease-out_0.2s_forwards]">
                        <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            2026 예상 리포트
                        </span>
                        <span className="bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <ShieldCheck size={10} /> 보험료 인하 조건
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.3s_forwards]">
                        보험료 인하 조건
                    </h1>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed opacity-0 animate-[fadeInUp_0.5s_ease-out_0.4s_forwards]">
                        아래 3가지 기준을 만족하면 보험료 인하 혜택이 적용됩니다. 주행 기록과 점수 기반으로 자동 판단됩니다.
                    </p>
                </div>

                <section className="relative rounded-[2rem] overflow-hidden p-6 mb-8 border border-white shadow-xl shadow-slate-200/60 opacity-0 animate-[fadeInScale_0.7s_ease-out_0.5s_forwards]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-slate-50 to-blue-500/10 z-0"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Policy Summary</p>
                                <h2 className="text-2xl font-black text-slate-900">Premium Reduction</h2>
                            </div>
                            <div className="bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600">자동 적용</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {POLICY_ITEMS.map((item) => (
                                <div key={item.id} className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-white/60">
                                    <div className="text-xs font-black text-slate-400 mb-1">조건 {item.id}</div>
                                    <div className="text-sm font-bold text-slate-900">{item.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="opacity-0 animate-[fadeInUp_0.6s_ease-out_0.7s_forwards]">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <div className="w-1 h-4 bg-slate-900 rounded-full"></div>
                            적용 조건
                        </h3>
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                            {POLICY_ITEMS.map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <span className="text-[11px] font-bold text-emerald-600">{item.id}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-700 leading-snug">{item.text}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-600">
                                            <CheckCircle2 size={12} />
                                            유지 시 보험료 인하 적용
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="opacity-0 animate-[fadeInUp_0.6s_ease-out_0.85s_forwards]">
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-xs font-medium text-slate-500 leading-relaxed">
                            주행 데이터는 기록 완료 후 일정 시간이 지나면 반영됩니다. 조건 충족 여부는 매월 갱신 시점에 다시 산정됩니다.
                        </div>
                    </div>
                </section>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-white via-white to-transparent z-[10000] opacity-0 animate-[slideUpFade_0.5s_ease-out_1.0s_forwards]">
                <button
                    onClick={() => navigate(-1)}
                    className="w-full h-14 rounded-[1.2rem] flex items-center justify-center gap-2 text-lg font-bold shadow-xl shadow-slate-200 transition-all active:scale-95 bg-slate-900 text-white hover:bg-slate-800"
                    type="button"
                >
                    확인하고 돌아가기
                </button>
            </div>
        </div>
    );

    if (!mounted) {
        return null;
    }

    return createPortal(content, document.body);
};

export default InsurancePolicyPage;
