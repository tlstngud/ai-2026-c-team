/**
 * GPS 기반 속도, 가속도, 감속도 모니터링 서비스
 */

// 두 좌표 간 거리 계산 (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위
};

// 속도 계산 (m/s -> km/h)
const calculateSpeed = (distance, timeDiff) => {
    if (timeDiff === 0) return 0;
    const speedMs = distance / timeDiff; // m/s
    return speedMs * 3.6; // km/h로 변환
};

// 가속도 계산 (m/s²)
const calculateAcceleration = (speed1, speed2, timeDiff) => {
    if (timeDiff === 0) return 0;
    const speedDiff = (speed2 - speed1) / 3.6; // km/h -> m/s
    return speedDiff / timeDiff; // m/s²
};

/**
 * GPS 모니터링 시작
 * @param {Function} onUpdate - 위치 업데이트 콜백 (speed, acceleration, isHardAccel, isHardBrake)
 * @param {Function} onError - 에러 콜백
 * @returns {number} watchId - watchPosition ID
 */
export const startGpsMonitoring = (onUpdate, onError) => {
    if (!navigator.geolocation) {
        onError(new Error('GPS를 지원하지 않는 기기입니다.'));
        return null;
    }

    let lastPosition = null;
    let lastTime = null;
    let lastSpeed = 0;
    const positionHistory = []; // 최근 위치 기록 (정확도 향상)

    const options = {
        enableHighAccuracy: true, // 고정밀도 위치 사용
        timeout: 10000, // 10초 타임아웃
        maximumAge: 1000 // 1초 이내 캐시된 위치 사용
    };

    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, speed: gpsSpeed, accuracy } = position.coords;
            const currentTime = Date.now();

            // GPS 속도가 있으면 우선 사용 (더 정확)
            if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0) {
                const speedKmh = gpsSpeed * 3.6; // m/s -> km/h
                const timeDiff = lastTime ? (currentTime - lastTime) / 1000 : 0;

                if (timeDiff > 0 && lastSpeed > 0) {
                    const acceleration = calculateAcceleration(lastSpeed, speedKmh, timeDiff);
                    const isHardAccel = acceleration > 3.0; // 3 m/s² 이상 = 급가속
                    const isHardBrake = acceleration < -4.0; // -4 m/s² 이하 = 급감속

                    onUpdate({
                        speed: speedKmh,
                        acceleration: acceleration,
                        isHardAccel,
                        isHardBrake,
                        latitude,
                        longitude,
                        accuracy
                    });
                }

                lastSpeed = speedKmh;
            } else if (lastPosition && lastTime) {
                // GPS 속도가 없으면 거리 기반 계산
                const distance = calculateDistance(
                    lastPosition.latitude,
                    lastPosition.longitude,
                    latitude,
                    longitude
                );
                const timeDiff = (currentTime - lastTime) / 1000; // 초 단위

                if (timeDiff > 0 && distance > 0) {
                    const speedKmh = calculateSpeed(distance, timeDiff);
                    const acceleration = calculateAcceleration(lastSpeed, speedKmh, timeDiff);
                    const isHardAccel = acceleration > 3.0;
                    const isHardBrake = acceleration < -4.0;

                    onUpdate({
                        speed: speedKmh,
                        acceleration: acceleration,
                        isHardAccel,
                        isHardBrake,
                        latitude,
                        longitude,
                        accuracy
                    });

                    lastSpeed = speedKmh;
                }
            }

            // 위치 기록 저장
            positionHistory.push({
                latitude,
                longitude,
                time: currentTime,
                speed: lastSpeed
            });

            // 최근 10개만 유지
            if (positionHistory.length > 10) {
                positionHistory.shift();
            }

            lastPosition = { latitude, longitude };
            lastTime = currentTime;
        },
        (error) => {
            console.error('GPS Error:', error);
            onError(error);
        },
        options
    );

    return watchId;
};

/**
 * GPS 모니터링 중지
 * @param {number} watchId - watchPosition ID
 */
export const stopGpsMonitoring = (watchId) => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
};

/**
 * 현재 위치 한 번만 가져오기
 * @returns {Promise} 위치 정보
 */
export const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GPS를 지원하지 않는 기기입니다.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};
