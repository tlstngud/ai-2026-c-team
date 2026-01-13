import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SignUpPage = () => {
    const [formData, setFormData] = useState({ id: '', name: '', password: '', agree: false });
    const [error, setError] = useState('');
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleSignUp = (e) => {
        e.preventDefault();
        if (!formData.id || !formData.name || !formData.password) {
            setError('모든 필드를 입력해주세요.');
            return;
        }
        if (!formData.agree) {
            setError('약관에 동의해야 가입이 가능합니다.');
            return;
        }

        const result = signUp(formData.id, formData.name, formData.password);
        if (result.success) {
            alert('회원가입이 완료되었습니다! 로그인해주세요.');
            navigate('/login');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
                <h1 className="text-2xl font-black text-slate-900 text-center mb-8">회원가입</h1>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mb-6 text-center">{error}</div>}

                <form onSubmit={handleSignUp} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">아이디</label>
                        <input
                            type="text"
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent focus:border-indigo-500"
                            placeholder="아이디를 입력하세요"
                            value={formData.id}
                            onChange={e => setFormData({ ...formData, id: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">이름</label>
                        <input
                            type="text"
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent focus:border-indigo-500"
                            placeholder="이름을 입력하세요"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">비밀번호</label>
                        <input
                            type="password"
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent focus:border-indigo-500"
                            placeholder="비밀번호를 입력하세요"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <label className="flex items-center gap-3 px-1 cursor-pointer py-2">
                        <input
                            type="checkbox"
                            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                            checked={formData.agree}
                            onChange={e => setFormData({ ...formData, agree: e.target.checked })}
                        />
                        <span className="text-sm text-slate-500 font-medium">안전 운전 약관에 동의합니다.</span>
                    </label>

                    <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all">
                        가입하기
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-400 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => navigate('/login')}>
                        이미 계정이 있으신가요? 로그인하기
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
