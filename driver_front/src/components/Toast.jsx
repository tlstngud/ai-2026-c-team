import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

const Toast = ({ message, isVisible, onClose, duration = 3000 }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isShowing, setIsShowing] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // 렌더링 후 애니메이션 시작
            setIsShowing(false);
            const showTimer = setTimeout(() => {
                setIsShowing(true);
            }, 10);

            // 자동으로 닫히는 타이머
            if (duration > 0) {
                const closeTimer = setTimeout(() => {
                    setIsClosing(true);
                    setTimeout(() => {
                        setIsShowing(false);
                        setIsClosing(false);
                        onClose();
                    }, 300); // fade-out 애니메이션 시간
                }, duration);
                return () => {
                    clearTimeout(showTimer);
                    clearTimeout(closeTimer);
                };
            }

            return () => clearTimeout(showTimer);
        } else {
            setIsShowing(false);
            setIsClosing(false);
        }
    }, [isVisible, duration, onClose]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsShowing(false);
            setIsClosing(false);
            onClose();
        }, 300);
    };

    if (!isVisible && !isClosing) return null;

    return (
        <div className={`fixed bottom-24 inset-x-0 flex justify-center z-[100] pointer-events-none transition-all duration-300 ${
            isClosing 
                ? 'opacity-0 translate-y-2' 
                : isShowing
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
        }`}>
            <div className="bg-white rounded-2xl px-5 py-3 shadow-2xl border border-slate-100 flex items-center gap-2.5 min-w-[280px] max-w-[90vw] pointer-events-auto">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="text-emerald-600" size={16} />
                </div>
                <p className="text-sm font-bold text-slate-900 flex-1">{message}</p>
                <button
                    onClick={handleClose}
                    className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-400 shrink-0"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
