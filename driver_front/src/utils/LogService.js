// 특정 유저의 로그 가져오기
export const getLogsByUserId = (userId) => {
    if (!userId) return [];
    try {
        const allLogs = localStorage.getItem(`logs_${userId}`);
        return allLogs ? JSON.parse(allLogs) : [];
    } catch (e) {
        console.error("Error loading logs", e);
        return [];
    }
};

// 특정 유저의 로그 추가하기
export const addLogByUserId = (userId, newLog) => {
    if (!userId) return [];
    try {
        const currentLogs = getLogsByUserId(userId);
        // 최신 로그가 맨 위로 오도록 추가
        const updatedLogs = [newLog, ...currentLogs];
        // 최대 저장 개수 제한 (예: 50개) - 필요시
        // const limitedLogs = updatedLogs.slice(0, 50);
        localStorage.setItem(`logs_${userId}`, JSON.stringify(updatedLogs));
        return updatedLogs;
    } catch (e) {
        console.error("Error saving log", e);
        return [];
    }
};
