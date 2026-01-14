import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

// 지자체별 챌린지 데이터베이스 (Dashboard와 동일)
const MUNICIPALITY_DB = {
    '춘천': {
        name: '춘천시',
        campaign: '스마일 춘천 안전운전',
        color: 'bg-emerald-500',
        accent: 'text-emerald-600',
        target: 90,
        reward: '춘천사랑상품권 3만원 + 보험할인',
        bgImage: 'from-emerald-900 to-slate-900'
    },
    '서울': {
        name: '서울특별시',
        campaign: '서울 마이-티 드라이버',
        color: 'bg-indigo-600',
        accent: 'text-indigo-600',
        target: 92,
        reward: '서울시 공영주차장 50% 할인권',
        bgImage: 'from-indigo-900 to-slate-900'
    },
    'default': {
        name: '전국 공통',
        campaign: '대한민국 안전운전 챌린지',
        color: 'bg-blue-600',
        accent: 'text-blue-600',
        target: 90,
        reward: '안전운전 인증서 발급',
        bgImage: 'from-blue-900 to-slate-900'
    }
};

const SignUpPage = () => {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        password: '',
        address: '',
        region: '전국 공통', // 기본값
        agree: false
    });
    const [error, setError] = useState('');
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleAddressSearch = () => {
        new window.daum.Postcode({
            oncomplete: function (data) {
                // data.sido: "경기", "서울", "강원특별자치도" 등
                // data.sigungu: "의왕시", "강남구", "인제군" 등

                // 1. 테마(색상, 리워드) 결정을 위한 키 설정
                let themeKey = 'default';
                if (data.sido.includes('강원') && (data.sigungu.includes('춘천') || data.address.includes('춘천'))) {
                    themeKey = '춘천';
                } else if (data.sido.includes('서울')) {
                    themeKey = '서울';
                }

                // 2. 표시 이름 설정: 시/도 + 시/군/구 (예: "경기 의왕시", "강원특별자치도 인제군")
                let displayRegion = data.sido;
                if (data.sigungu) {
                    displayRegion = `${data.sido} ${data.sigungu}`;
                }

                setFormData(prev => ({
                    ...prev,
                    address: data.roadAddress,
                    region: displayRegion,
                    _themeKey: themeKey // 테마용 키
                }));
            }
        }).open();
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!formData.id || !formData.name || !formData.password || !formData.address) {
            setError('모든 필드를 입력해주세요.');
            return;
        }
        if (!formData.agree) {
            setError('약관에 동의해야 가입이 가능합니다.');
            return;
        }

        // 지자체 정보 구성
        const themeKey = formData._themeKey || 'default';
        const baseTheme = MUNICIPALITY_DB[themeKey] || MUNICIPALITY_DB['default'];

        // 이름과 캠페인명은 실제 주소 기반으로 동적 생성 (기존 DB값 덮어쓰기)
        const regionData = {
            ...baseTheme,
            name: formData.region, // "경기도", "부산광역시" 등 실제 이름
            campaign: themeKey === 'default' ? `${formData.region} 안전운전 챌린지` : baseTheme.campaign,
            address: formData.address
        };

        const result = await signUp(formData.id, formData.name, formData.password, regionData);
        if (result.success) {
            // 지자체 정보 저장 (API에서 이미 저장됨)
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

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">거주지 주소</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent cursor-pointer hover:bg-slate-100 transition-colors"
                                placeholder="주소를 검색해주세요"
                                value={formData.address}
                                readOnly
                                onClick={handleAddressSearch}
                            />
                            <button
                                type="button"
                                onClick={handleAddressSearch}
                                className="bg-indigo-600 text-white px-5 rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center"
                            >
                                <Search size={20} />
                            </button>
                        </div>
                        {formData.address && (
                            <p className="text-xs text-slate-500 mt-2 ml-1">
                                관할 지역: <span className="font-bold text-indigo-600">{formData.region}</span>
                            </p>
                        )}
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
