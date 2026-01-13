import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 현재 로그인한 유저
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) setUser(JSON.parse(savedUser));
        setLoading(false);
    }, []);

    // 1. 회원가입 함수
    const signUp = (id, name, password, regionData = null) => {
        const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');

        // 중복 아이디 체크
        if (allUsers.find(u => u.id === id)) {
            return { success: false, message: '이미 존재하는 아이디입니다.' };
        }

        const newUser = {
            id,
            name,
            password, // 해커톤용이므로 평문 저장 (실제 서비스는 암호화 필요)
            score: 80, // 초기 점수
            discount: 0,
            violations: { drowsy: 0, phone: 0, assault: 0 },
            region: regionData // 지자체 정보 저장
        };

        const updatedUsers = [...allUsers, newUser];
        localStorage.setItem('allUsers', JSON.stringify(updatedUsers));
        return { success: true };
    };

    // 2. 로그인 함수
    const login = (id, password) => {
        const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
        const foundUser = allUsers.find(u => u.id === id && u.password === password);

        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('currentUser', JSON.stringify(foundUser));
            // user에 region이 있으면 localStorage에도 저장
            if (foundUser.region) {
                localStorage.setItem('userRegion', JSON.stringify(foundUser.region));
            }
            return { success: true };
        }
        return { success: false, message: '아이디 또는 비밀번호가 틀렸습니다.' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser');
    };

    return (
        <AuthContext.Provider value={{ user, signUp, login, logout, setUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
