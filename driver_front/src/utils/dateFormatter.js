// 날짜 포맷팅 유틸리티 함수

/**
 * ISO 날짜 문자열을 사용자 친화적인 형식으로 변환
 * @param {string|Date} dateInput - ISO 날짜 문자열 또는 Date 객체
 * @returns {Object} { date: "2026.01.15", time: "13:52", fullDate: "2026년 1월 15일 13:52" }
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return { date: '', time: '', fullDate: '' };
    
    try {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', dateInput);
            return { date: '', time: '', fullDate: '' };
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return {
            date: `${year}.${month}.${day}`,
            time: `${hours}:${minutes}`,
            fullDate: `${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${hours}:${minutes}`,
            dateTime: `${year}.${month}.${day} ${hours}:${minutes}`
        };
    } catch (error) {
        console.error('Date formatting error:', error);
        return { date: '', time: '', fullDate: '' };
    }
};

/**
 * 로그 데이터에 표시용 날짜 정보 추가
 * @param {Object} log - 로그 객체
 * @returns {Object} 날짜 정보가 추가된 로그 객체
 */
export const enrichLogWithFormattedDate = (log) => {
    if (!log) return log;
    
    const formatted = formatDate(log.date || log.dateDisplay);
    
    return {
        ...log,
        formattedDate: formatted.date,
        formattedTime: formatted.time,
        formattedFullDate: formatted.fullDate,
        formattedDateTime: formatted.dateTime
    };
};
