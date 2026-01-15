import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const LoginPage = () => {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!id.trim() || !password.trim()) {
            setError('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        const result = await login(id, password);

        if (result.success) {
            navigate('/drive');
        } else {
            setError(result.message || '로그인 실패');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-black text-slate-900">춘천 안심 드라이브</h1>
                    <p className="text-sm text-slate-400 mt-2 font-medium">서비스를 시작하려면 로그인하세요</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-2 text-sm font-bold animate-in fade-in zoom-in duration-200">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 tracking-wider">아이디</label>
                        <input
                            type="text"
                            className={`w-full mt-2 p-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all ${error ? 'border-red-200 focus:border-red-500' : 'border-transparent focus:border-indigo-500'
                                }`}
                            placeholder="아이디를 입력하세요"
                            value={id}
                            onChange={(e) => {
                                setId(e.target.value);
                                if (error) setError('');
                            }}
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 tracking-wider">비밀번호</label>
                        <input
                            type="password"
                            className="w-full mt-2 p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) setError('');
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                    >
                        로그인하기
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                        아직 회원이 아니신가요? <span className="text-indigo-600 font-bold cursor-pointer hover:underline" onClick={() => navigate('/signup')}>회원가입</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
