/**
 * GPS + 가속도 센서 기반 차량 모니터링 서비스
 * - GPS: 속도 표시용
 * - 가속도 센서: 급가속/급감속 감지용 (더 정확)
 */

// G-Force 임계값 (1G ≈ 9.8m/s²)
const HARD_ACCEL_THRESHOLD = 3.5; // m/s² (급가속)
const HARD_BRAKE_THRESHOLD = -4.5; // m/s² (급감속, 브레이크가 더 강함)
const MIN_SPEED_FOR_MOTION = 10; // km/h (이 속도 이상일 때만 가속도 센서 판단)

/**
 * iOS 13+ 가속도 센서 권한 요청
 * @returns {Promise<boolean>} 권한 허용 여부
 */
export const requestMotionPermission = async () => {
    if (typeof DeviceMotionEvent === 'undefined') {
        return false;
    }

    // iOS 13+ 권한 요청 필요
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            return permission === 'granted';
        } catch (e) {
            console.error('가속도 센서 권한 요청 실패:', e);
            return false;
        }
    }

    // Android 또는 iOS 12 이하는 권한 요청 불필요
    return true;
};

/**
 * GPS + 가속도 센서 모니터링 시작
 * @param {Function} onUpdate - 업데이트 콜백
 * @param {Function} onError - 에러 콜백
 * @returns {Function} 정리(Cleanup) 함수
 */
export const startGpsMonitoring = (onUpdate, onError) => {
    if (!navigator.geolocation) {
        onError(new Error('GPS를 지원하지 않는 기기입니다.'));
        return null;
    }

    let lastSpeedKmh = 0;
    let lastOverspeedCheck = 0;
    let motionHandler = null;
    let gpsWatchId = null;

    // --- [A] 가속도 센서 (급가속/급감속 감지용) ---
    const handleMotion = (event) => {
        const { acceleration } = event;
        if (!acceleration) return;

        // 차량 진행 방향의 가속도 (y축 기준, 폰을 세워뒀을 때)
        // iOS와 Android 간 좌표계 차이 고려 필요
        const accelY = acceleration.y || 0;
        const accelX = acceleration.x || 0;

        // 벡터 크기 계산 (x, y축 모두 고려)
        const accelMagnitude = Math.sqrt(accelX * accelX + accelY * accelY);

        // 필터링: 작은 진동 무시 (1.0 m/s² 미만)
        if (accelMagnitude < 1.0) return;

        // 속도가 10km/h 이상일 때만 판단 (정지 상태에서의 노이즈 제거)
        if (lastSpeedKmh < MIN_SPEED_FOR_MOTION) return;

        let isHardAccel = false;
        let isHardBrake = false;

        // y축이 주축 (세로 방향, 일반적인 차량 거치 상태)
        // 양수 = 가속, 음수 = 감속 (기기 방향에 따라 반대일 수 있음)
        // 안전하게 절댓값이 큰 쪽을 사용
        if (Math.abs(accelY) > Math.abs(accelX)) {
            if (accelY > HARD_ACCEL_THRESHOLD) {
                isHardAccel = true;
            } else if (accelY < HARD_BRAKE_THRESHOLD) {
                isHardBrake = true;
            }
        } else {
            // x축이 주축인 경우
            if (accelX > HARD_ACCEL_THRESHOLD) {
                isHardAccel = true;
            } else if (accelX < HARD_BRAKE_THRESHOLD) {
                isHardBrake = true;
            }
        }

        if (isHardAccel || isHardBrake) {
            onUpdate({
                type: 'MOTION',
                accelValue: Math.abs(accelY) > Math.abs(accelX) ? accelY : accelX,
                isHardAccel,
                isHardBrake,
                speed: lastSpeedKmh // 현재 속도 정보도 함께 전달
            });
        }
    };

    // 가속도 센서 이벤트 리스너 등록
    if (typeof DeviceMotionEvent !== 'undefined') {
        motionHandler = handleMotion;
        window.addEventListener('devicemotion', motionHandler);
    }

    // --- [B] GPS (속도 및 위치 표시용) ---
    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0 // 캐시 사용 안 함
    };

    gpsWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, speed: gpsSpeed, accuracy } = position.coords;
            const currentTime = Date.now();

            // GPS 속도 (m/s -> km/h)
            // speed가 null이면 0 처리 (거리 기반 계산은 오차가 크므로 사용 안 함)
            const currentSpeedKmh = (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0)
                ? gpsSpeed * 3.6
                : 0;

            lastSpeedKmh = currentSpeedKmh;

            // 과속 감지 (5초마다 한 번만 체크)
            let isOverspeed = false;
            if (currentSpeedKmh > 0 && (currentTime - lastOverspeedCheck) > 5000) {
                isOverspeed = currentSpeedKmh > 100; // 100km/h 이상
                if (isOverspeed) {
                    lastOverspeedCheck = currentTime;
                }
            }

            onUpdate({
                type: 'GPS',
                latitude,
                longitude,
                speed: currentSpeedKmh,
                accuracy,
                isOverspeed
            });
        },
        (error) => {
            console.error('GPS Error:', error);
            onError(error);
        },
        options
    );

    // 정리(Cleanup) 함수 반환
    return () => {
        if (motionHandler) {
            window.removeEventListener('devicemotion', motionHandler);
        }
        if (gpsWatchId !== null) {
            navigator.geolocation.clearWatch(gpsWatchId);
        }
    };
};

/**
 * GPS 모니터링 중지
 * @param {Function} cleanup - startGpsMonitoring에서 반환된 정리 함수
 */
export const stopGpsMonitoring = (cleanup) => {
    if (cleanup && typeof cleanup === 'function') {
        cleanup();
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
