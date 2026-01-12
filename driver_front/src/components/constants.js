import { ShieldCheck, Moon, Eye, Smartphone, AlertTriangle } from 'lucide-react';

// 상태 정의 (시연용 가상 로직)
export const STATE_CONFIG = {
    0: { label: 'Driving Safe', icon: ShieldCheck, color: 'text-green-500', border: 'border-white/30', bg: 'bg-black/40' },
    1: { label: 'Drowsy', icon: Moon, color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-900/40' },
    2: { label: 'Distracted', icon: Eye, color: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-900/40' },
    3: { label: 'Phone Use', icon: Smartphone, color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-900/40' },
    4: { label: 'Violence', icon: AlertTriangle, color: 'text-red-600', border: 'border-red-600/60', bg: 'bg-red-950/50' },
};

// Apple Music 스타일용 상태 정의
export const APPLE_STATE_CONFIG = {
    0: { label: 'Normal Driving', icon: ShieldCheck, color: 'text-gray-900', bg: 'bg-gray-100', penalty: 0 },
    1: { label: 'Drowsy Detected', icon: Moon, color: 'text-amber-500', bg: 'bg-amber-50', penalty: 2.0 },
    2: { label: 'Distracted (Search)', icon: Eye, color: 'text-orange-500', bg: 'bg-orange-50', penalty: 3.0 },
    3: { label: 'Phone Usage', icon: Smartphone, color: 'text-red-500', bg: 'bg-red-50', penalty: 5.0 },
    4: { label: 'Violence / Assault', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', penalty: 10.0 },
};
