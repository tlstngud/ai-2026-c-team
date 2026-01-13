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

    // 데스크탑/노트북 환경 감지
    const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;
    if (isDesktop) {
        console.log('💻 데스크탑 환경 감지: GPS 속도는 0으로 표시될 수 있습니다.');
    }

    let lastSpeedKmh = 0;
    let lastOverspeedCheck = 0;
    let motionHandler = null;
    let gpsWatchId = null;

    // --- [A] 가속도 센서 (급가속/급감속 감지용) ---
    let motionEventCount = 0;
    const handleMotion = (event) => {
        motionEventCount++;

        // iOS는 accelerationIncludingGravity를 사용해야 할 수 있음
        const { acceleration, accelerationIncludingGravity } = event;
        const accel = acceleration || accelerationIncludingGravity;

        if (!accel) {
            // 처음 몇 번만 로그
            if (motionEventCount <= 3) {
                console.log('⚠️ 가속도 데이터 없음', { event });
            }
            return;
        }

        // 디버깅: 가속도 값 확인 (처음 5번 + 이후 1% 확률)
        if (motionEventCount <= 5 || Math.random() < 0.01) {
            console.log('📱 가속도 센서 데이터:', {
                x: accel.x?.toFixed(2),
                y: accel.y?.toFixed(2),
                z: accel.z?.toFixed(2),
                speed: lastSpeedKmh.toFixed(1) + ' km/h',
                count: motionEventCount
            });
        }

        const accelY = accel.y || 0;
        const accelX = accel.x || 0;
        const accelZ = accel.z || 0;

        // 벡터 크기 계산 (x, y, z축 모두 고려)
        const accelMagnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

        // 필터링: 작은 진동 무시 (1.0 m/s² 미만)
        if (accelMagnitude < 1.0) return;

        // 테스트 모드: 속도 제한 완화 (정지 상태에서도 테스트 가능)
        // 실제 운전 시에는 아래 주석을 해제하고 테스트 모드 로직 제거
        const isTestMode = lastSpeedKmh < MIN_SPEED_FOR_MOTION;
        // if (lastSpeedKmh < MIN_SPEED_FOR_MOTION) return; // 실제 운전 시 활성화

        let isHardAccel = false;
        let isHardBrake = false;

        // 가장 큰 가속도 축 찾기 (절댓값 기준)
        const absX = Math.abs(accelX);
        const absY = Math.abs(accelY);
        const absZ = Math.abs(accelZ);

        let mainAccel = 0;
        if (absX >= absY && absX >= absZ) {
            mainAccel = accelX;
        } else if (absY >= absX && absY >= absZ) {
            mainAccel = accelY;
        } else {
            mainAccel = accelZ;
        }

        // 임계값 체크
        if (mainAccel > HARD_ACCEL_THRESHOLD) {
            isHardAccel = true;
            console.log('🚀 급가속 감지!', {
                accel: mainAccel.toFixed(2) + ' m/s²',
                speed: lastSpeedKmh.toFixed(1) + ' km/h',
                testMode: isTestMode,
                axis: absX >= absY && absX >= absZ ? 'X' : (absY >= absX && absY >= absZ ? 'Y' : 'Z')
            });
        } else if (mainAccel < HARD_BRAKE_THRESHOLD) {
            isHardBrake = true;
            console.log('🛑 급감속 감지!', {
                accel: mainAccel.toFixed(2) + ' m/s²',
                speed: lastSpeedKmh.toFixed(1) + ' km/h',
                testMode: isTestMode,
                axis: absX >= absY && absX >= absZ ? 'X' : (absY >= absX && absY >= absZ ? 'Y' : 'Z')
            });
        }

        if (isHardAccel || isHardBrake) {
            onUpdate({
                type: 'MOTION',
                accelValue: mainAccel,
                isHardAccel,
                isHardBrake,
                speed: lastSpeedKmh
            });
        }
    };

    // 가속도 센서 이벤트 리스너 등록
    if (typeof DeviceMotionEvent !== 'undefined') {
        motionHandler = handleMotion;
        window.addEventListener('devicemotion', motionHandler);
        console.log('✅ 가속도 센서 이벤트 리스너 등록됨');

        // 노트북/데스크탑에서는 가속도 센서가 없을 수 있음
        if (isDesktop) {
            console.log('💻 노트북/데스크탑: 가속도 센서가 없을 수 있습니다. 모바일 기기에서 테스트해주세요.');
        }
    } else {
        console.warn('⚠️ DeviceMotionEvent를 지원하지 않는 브라우저입니다.');
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
            // 노트북/데스크탑에서는 GPS speed가 null일 가능성이 높음
            const currentSpeedKmh = (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0)
                ? gpsSpeed * 3.6
                : 0;

            // 노트북에서 GPS speed가 없을 때 경고 (처음 한 번만)
            if (isDesktop && currentSpeedKmh === 0 && lastSpeedKmh === 0 && gpsSpeed === null) {
                console.log('💻 노트북 환경: GPS 속도 정보가 없습니다. 실제 운전은 모바일 기기에서 테스트해주세요.');
            }

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
            // GPS 오류 코드별 상세 메시지
            let errorMessage = 'GPS 오류가 발생했습니다.';
            let errorType = 'unknown';

            switch (error.code) {
                case 1: // PERMISSION_DENIED
                    errorMessage = '위치 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.';
                    errorType = 'permission_denied';
                    console.warn('🚫 위치 권한 거부됨');
                    break;
                case 2: // POSITION_UNAVAILABLE
                    errorMessage = '위치 정보를 사용할 수 없습니다. 위치 서비스가 활성화되어 있는지 확인해주세요.';
                    errorType = 'position_unavailable';
                    console.warn('⚠️ 위치 정보 사용 불가:', {
                        message: error.message,
                        note: 'iOS에서는 설정 > 개인정보 보호 및 보안 > 위치 서비스가 켜져 있어야 합니다.'
                    });
                    break;
                case 3: // TIMEOUT
                    errorMessage = '위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.';
                    errorType = 'timeout';
                    console.warn('⏱️ 위치 요청 시간 초과');
                    break;
                default:
                    console.error('GPS Error:', error);
            }

            // 오류 정보를 콜백에 전달
            onError({
                ...error,
                userMessage: errorMessage,
                errorType: errorType
            });
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
