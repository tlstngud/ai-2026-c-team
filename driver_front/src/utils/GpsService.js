/**
 * GPS + 가속도 센서 기반 차량 모니터링 서비스
 * - GPS: 속도 표시용
 * - 가속도 센서: 급가속/급감속 감지용 (더 정확)
 */

// G-Force 임계값 (1G ≈ 9.8m/s²)
// 시연용으로 허들 낮춤 (더 쉽게 감지되도록)
const HARD_ACCEL_THRESHOLD = 2.5; // m/s² (급가속) - 시연용으로 낮춤 (기존 4.5)
const HARD_BRAKE_THRESHOLD = -3.0; // m/s² (급감속) - 시연용으로 낮춤 (기존 -5.5)
const MIN_SPEED_FOR_MOTION = 1; // km/h (이 속도 이상일 때만 가속도 센서 판단) - 시연용으로 낮춤 (기존 10)

// 최종 확정된 설정값
export const SCORE_CONFIG = {
    // 감점 (Penalty)
    PENALTY: {
        DROWSY: 8.0,      // 졸음 (기존 유지)
        DISTRACTED: 4.0,  // 주시태만 (기존 유지)
        ASSAULT: 10.0,    // 폭행 (기존 유지)
        HARD_BRAKE: 5.0,  // 급감속 (기존 유지)
        HARD_ACCEL: 3.0,  // 급가속 (기존 유지)
        OVERSPEED: 0.2    // ★ 수정됨: 요청하신 -0.2점 반영
    },
    // 회복 (Recovery)
    RECOVERY_PER_KM: 0.8, // ★ 수정됨: 요청하신 1km당 0.8점 회복
    RECOVERY_30_SEC: 1.0, // [NEW] 30초 정상 주행 시 1점 회복


    // 난이도 조절 (건드리지 않음)
    DIFFICULTY_MULTIPLIER: 1.5 // 90점 이상일 때 감점 1.5배
};

// [DEV] 테스트용 춘천 모의 좌표
const MOCK_LOCATION = {
    latitude: 37.886282,
    longitude: 127.788785
};

// TMAP API 설정
const TMAP_API_KEY = '49sDimr9yt5PxoX30zQq481OCuwcUNDV6D2cbXs3';
const TMAP_API_VERSION = '1'; // API 버전
// TMAP NearToRoad API 엔드포인트 (가까운 도로 찾기)
const TMAP_NEAR_TO_ROAD_API_URL = `https://apis.openapi.sk.com/tmap/road/nearToRoad`;
// TMAP Reverse Geocoding API 엔드포인트
const TMAP_REVERSE_GEOCODING_URL = `https://apis.openapi.sk.com/tmap/geo/reversegeocoding`;
const SPEED_LIMIT_CHECK_INTERVAL = 5000; // 5초마다 제한 속도 조회

/**
 * 좌표로 주소 변환 (Reverse Geocoding)
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>} 변환된 주소 (실패 시 null)
 */
export const getAddressFromCoords = async (latitude, longitude) => {
    // API 문서: https://tmapapi.sktelecom.com/main.html#webservice/docs/tmapPointer/ReverseGeocoding
    // addressType: A00(행정동), A01(법정동), A02(도로명), A03(지번), A04(건물명)
    const queryParams = new URLSearchParams({
        version: TMAP_API_VERSION,
        appKey: TMAP_API_KEY,
        lat: latitude.toString(),
        lon: longitude.toString(),
        coordType: 'WGS84GEO',
        addressType: 'A02' // 도로명+지번
    });

    const fullUrl = `${TMAP_REVERSE_GEOCODING_URL}?${queryParams.toString()}`;

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error('Reverse Geocoding Failed:', response.status);
            return null;
        }

        const data = await response.json();
        // 응답에서 시/도, 구/군, 도로명 등을 조합하여 전체 주소 생성
        // addressInfo 구조: { fullAddress, city_do, gu_gun, roadName, ... }
        if (data.addressInfo) {
            return data.addressInfo.fullAddress || `${data.addressInfo.city_do} ${data.addressInfo.gu_gun}`;
        }
        return null;

    } catch (error) {
        console.error('Reverse Geocoding Error:', error);
        return null;
    }
};

/**
 * TMAP NearToRoad API로 도로 제한 속도 조회
 * @param {number} latitude - 위도
 * @param {number} longitude - 경도
 * @returns {Promise<{speedLimit: number, roadName: string}>} 제한 속도 및 도로명
 */
const getSpeedLimitFromTmap = async (latitude, longitude) => {
    // GET 요청을 위한 Query String 생성
    const queryParams = new URLSearchParams({
        version: TMAP_API_VERSION,
        appKey: TMAP_API_KEY,
        lat: latitude.toString(),
        lon: longitude.toString()
    });
    const fullUrl = `${TMAP_NEAR_TO_ROAD_API_URL}?${queryParams.toString()}`;

    // 요청 정보 저장 (디버깅용)
    const requestInfo = {
        url: fullUrl,
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
        latitude: latitude,
        longitude: longitude,
        version: TMAP_API_VERSION,
        timestamp: new Date().toISOString()
    };

    try {
        // CORS 및 네트워크 오류 처리
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // 204 No Content 처리 (검색 결과가 없는 경우)
        if (response.status === 204) {
            return {
                speedLimit: null,
                roadName: null,
                roadId: null,
                error: '204 No Content - 검색 결과 없음',
                errorCode: '204',
                requestInfo: requestInfo
            };
        }

        // 400 Bad Request 처리
        if (response.status === 400) {
            const errorText = await response.text();
            let errorData = null;
            let errorMessage = '요청 데이터 오류입니다. 파라미터를 확인해주세요.';
            let errorCode = '400';

            try {
                errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || errorData.message || errorMessage;
                errorCode = errorData.error?.code || errorData.errorCode || errorCode;
            } catch (e) {
                // JSON 파싱 실패 시 텍스트 그대로 사용
                errorMessage = errorText || errorMessage;
            }


            return {
                speedLimit: null,
                roadName: null,
                roadId: null,
                error: errorMessage,
                errorCode: errorCode,
                rawResponse: errorText.substring(0, 500),
                requestInfo: requestInfo
            };
        }

        // 500 Internal Server Error 처리
        if (response.status === 500) {
            const errorText = await response.text();
            return {
                speedLimit: null,
                roadName: null,
                roadId: null,
                error: '시스템 오류입니다.',
                errorCode: '1005',
                rawResponse: errorText.substring(0, 500),
                requestInfo: requestInfo
            };
        }

        // 기타 오류 처리
        if (!response.ok) {
            const errorText = await response.text();
            return {
                speedLimit: null,
                roadName: null,
                roadId: null,
                error: `TMAP API 오류: ${response.status} - ${response.statusText}`,
                errorCode: String(response.status),
                rawResponse: errorText.substring(0, 500),
                requestInfo: requestInfo
            };
        }

        // 응답 텍스트 먼저 확인
        const responseText = await response.text();

        // 빈 응답 처리
        if (!responseText || responseText.trim() === '') {
            return {
                speedLimit: null,
                roadName: null,
                roadId: null,
                error: '응답 본문이 비어있습니다',
                errorCode: 'EMPTY_RESPONSE',
                requestInfo: requestInfo
            };
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            return {
                speedLimit: null,
                roadName: null,
                roadId: null,
                error: 'JSON 파싱 오류',
                errorCode: 'PARSE_ERROR',
                rawResponse: responseText.substring(0, 500),
                requestInfo: requestInfo
            };
        }

        // TMAP NearToRoad API 응답 구조 파싱
        // 응답 형식: { resultData: { header: { speed, roadName, linkId, roadCategory, ... }, linkPoints: [...] } }
        let result = { speedLimit: null, roadName: null, roadId: null };

        // 도로 카테고리 매핑 (roadCategory -> 도로명)
        const roadCategoryMap = {
            0: '고속국도',
            1: '도시고속화도로',
            2: '국도',
            3: '국가지원지방도',
            4: '지방도',
            5: '주요도로 1',
            6: '주요도로 2',
            7: '주요도로 3',
            8: '기타도로 1',
            9: '이면도로',
            10: '페리항로',
            11: '단지내도로',
            12: '이면도로 2'
        };

        if (data.resultData) {
            const header = data.resultData.header || {};

            // header에서 직접 데이터 추출
            if (header) {

                // speed 필드 확인 (응답 구조: speed는 숫자로 옴)
                const speedLimitValue = header.speed !== undefined && header.speed !== null
                    ? Number(header.speed)
                    : null;

                // 도로명 확인 (roadName이 있으면 사용, 없으면 roadCategory로 매핑)
                const roadNameValue = header.roadName && header.roadName.trim() !== ''
                    ? header.roadName
                    : (header.roadCategory !== undefined && header.roadCategory !== null
                        ? roadCategoryMap[header.roadCategory] || `도로등급 ${header.roadCategory}`
                        : null);

                result = {
                    speedLimit: speedLimitValue, // 제한 속도 (km/h) - 숫자로 변환
                    roadName: roadNameValue,
                    roadId: header.linkId || null, // 링크 ID
                    rawResponse: JSON.stringify(data).substring(0, 1000), // 디버깅용: 응답 전체 (최대 1000자)
                    headerKeys: Object.keys(header), // 디버깅용: header의 모든 키
                    headerRaw: JSON.stringify(header).substring(0, 500), // 디버깅용: header 전체
                    requestInfo: requestInfo // 디버깅용: 요청 정보
                };

                return result;
            } else {
                // header가 없는 경우
                return {
                    speedLimit: null,
                    roadName: null,
                    roadId: null,
                    rawResponse: JSON.stringify(data).substring(0, 1000), // 디버깅용: 응답 전체
                    error: 'header가 응답에 없음',
                    requestInfo: requestInfo
                };
            }
        }

        // resultData가 없는 경우
        return {
            speedLimit: null,
            roadName: null,
            roadId: null,
            rawResponse: JSON.stringify(data).substring(0, 1000), // 디버깅용: 응답 전체
            error: 'resultData가 응답에 없음',
            responseKeys: Object.keys(data),
            fullResponse: data,
            requestInfo: requestInfo
        };
    } catch (error) {
        // 네트워크 오류 상세 분석
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('❌ TMAP API 네트워크 오류:', {
                오류타입: 'DNS 해석 실패 또는 CORS 오류',
                오류메시지: error.message,
                가능한원인: [
                    '1. API 도메인(api.roadno.co.kr)이 존재하지 않음',
                    '2. 네트워크 연결 문제',
                    '3. CORS 정책으로 인한 차단',
                    '4. 잘못된 API 엔드포인트'
                ],
                해결방법: [
                    'TMAP 개발자 포털(https://developers.sk.com)에서 정확한 API URL 확인',
                    'API 키 및 엔드포인트 재확인',
                    '대체 URL 시도: https://apis.openapi.sk.com/tmap/roads/snap'
                ],
                현재URL: TMAP_SNAP_API_URL
            });
        } else if (error.name === 'AbortError') {
            console.error('❌ TMAP API 타임아웃:', {
                오류타입: '요청 시간 초과 (10초)',
                error: error.message
            });
        } else {
            console.error('❌ TMAP API 호출 실패:', {
                error: error.message,
                errorName: error.name,
                stack: error.stack
            });
        }
        return {
            speedLimit: null,
            roadName: null,
            roadId: null,
            error: error.message || '알 수 없는 오류',
            errorCode: 'UNKNOWN_ERROR',
            requestInfo: requestInfo
        };
    }
};

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
    let lastSpeedLimitCheck = 0; // 제한 속도 조회 throttle
    let currentSpeedLimit = null; // 현재 도로 제한 속도
    let currentRoadName = null; // 현재 도로명

    // --- [A] 가속도 센서 (급가속/급감속 감지용) ---
    let motionEventCount = 0;
    const handleMotion = (event) => {
        motionEventCount++;

        // iOS는 accelerationIncludingGravity를 사용해야 할 수 있음
        const { acceleration, accelerationIncludingGravity } = event;
        const accel = acceleration || accelerationIncludingGravity;

        if (!accel) {
            return;
        }


        const accelY = accel.y || 0;
        const accelX = accel.x || 0;
        const accelZ = accel.z || 0;

        // 벡터 크기 계산 (x, y, z축 모두 고려)
        const accelMagnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

        // 필터링: 작은 진동 무시 (1.0 m/s² 미만)
        if (accelMagnitude < 1.0) return;

        // 속도 제한: 최소 속도 이상일 때만 가속도 센서 판단
        if (lastSpeedKmh < MIN_SPEED_FOR_MOTION) return;

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
        } else if (mainAccel < HARD_BRAKE_THRESHOLD) {
            isHardBrake = true;
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
    }

    // --- [B] GPS (속도 및 위치 표시용) ---
    // position.coords.speed를 직접 사용하는 것이 가장 정확 (도플러 효과 기반)
    // 거리 기반 계산은 GPS 오차(Drift) 때문에 부정확하므로 사용하지 않음
    const options = {
        enableHighAccuracy: true, // 배터리 더 쓰더라도 가장 정확한 모드 사용
        timeout: 10000,
        maximumAge: 0 // 캐시된 위치 절대 사용 안 함 (실시간성 중요)
    };

    gpsWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, speed: gpsSpeed, accuracy, heading } = position.coords;
            const currentTime = Date.now();

            // GPS 속도 직접 사용 (m/s -> km/h)
            // speed가 null이면 0으로 처리 (정지 상태 또는 실내/지하)
            let currentSpeedKmh = 0;
            let gpsStatus = 'GPS 검색중...';

            if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0) {
                currentSpeedKmh = gpsSpeed * 3.6; // m/s -> km/h

                // 정확도에 따른 상태 메시지
                if (accuracy && accuracy < 20) {
                    gpsStatus = 'GPS 신호 좋음';
                } else if (accuracy && accuracy < 50) {
                    gpsStatus = 'GPS 신호 보통';
                } else if (accuracy && accuracy < 100) {
                    gpsStatus = 'GPS 신호 약함';
                } else {
                    gpsStatus = 'GPS 신호 매우 약함 (실내/터널 가능)';
                }
            } else {
                // speed가 null인 경우
                if (accuracy && accuracy > 1000) {
                    gpsStatus = 'Wi-Fi/기지국 위치 (속도 불가)';
                } else if (accuracy && accuracy > 100) {
                    gpsStatus = 'GPS 신호 약함 (속도 불가)';
                } else {
                    gpsStatus = '정지 상태 또는 실내';
                }
            }

            lastSpeedKmh = currentSpeedKmh;

            // TMAP API로 제한 속도 조회 (5초마다 한 번만)
            if ((currentTime - lastSpeedLimitCheck) > SPEED_LIMIT_CHECK_INTERVAL &&
                latitude && longitude && accuracy && accuracy < 100) {
                // 정확도가 좋을 때만 조회 (100m 이내)
                lastSpeedLimitCheck = currentTime;

                // 조회 시작 알림
                onUpdate({
                    type: 'SPEED_LIMIT_LOADING'
                });

                // 비동기로 제한 속도 조회 (블로킹 방지)
                getSpeedLimitFromTmap(latitude, longitude).then(result => {
                    currentSpeedLimit = result.speedLimit;
                    currentRoadName = result.roadName;

                    // 제한 속도 업데이트를 콜백으로 전달
                    onUpdate({
                        type: 'SPEED_LIMIT',
                        speedLimit: currentSpeedLimit,
                        roadName: currentRoadName,
                        rawResponse: result.rawResponse,
                        headerKeys: result.headerKeys,
                        headerRaw: result.headerRaw,
                        matchedPointKeys: result.headerKeys,
                        matchedPointRaw: result.headerRaw,
                        error: result.error,
                        errorCode: result.errorCode,
                        responseKeys: result.responseKeys,
                        requestInfo: result.requestInfo
                    });
                }).catch(error => {
                    // 오류 발생 시에도 로딩 상태 해제
                    onUpdate({
                        type: 'SPEED_LIMIT',
                        speedLimit: null,
                        roadName: null
                    });
                });
            }

            // 과속 감지
            let isOverspeed = false;
            if (currentSpeedKmh > 0) {
                if (currentSpeedLimit) {
                    // 제한 속도가 있으면 제한 속도 기준으로 감지 (5km/h 여유)
                    isOverspeed = currentSpeedKmh > currentSpeedLimit + 5;
                } else {
                    // 제한 속도가 없으면 기본값 100km/h 기준 (5초마다 한 번만)
                    if ((currentTime - lastOverspeedCheck) > 5000) {
                        isOverspeed = currentSpeedKmh > 100;
                        if (isOverspeed) {
                            lastOverspeedCheck = currentTime;
                        }
                    }
                }
            }

            onUpdate({
                type: 'GPS',
                latitude,
                longitude,
                speed: currentSpeedKmh || 0, // 속도가 없으면 0
                heading: heading || 0,
                accuracy: accuracy ? Math.floor(accuracy) : null,
                isOverspeed,
                status: gpsStatus,
                speedLimit: currentSpeedLimit,
                roadName: currentRoadName
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
                    break;
                case 2: // POSITION_UNAVAILABLE
                    errorMessage = '위치 정보를 사용할 수 없습니다. 위치 서비스가 활성화되어 있는지 확인해주세요.';
                    errorType = 'position_unavailable';
                    break;
                case 3: // TIMEOUT
                    errorMessage = '위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.';
                    errorType = 'timeout';
                    break;
                default:
                    break;
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
 * 현재 위치 한 번만 가져오기 (실패 시 Mock 좌표 반환)
 * @returns {Promise} 위치 정보
 */
export const getCurrentPosition = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('[GPS] 미지원 기기 -> Mock 좌표 사용');
            resolve({ ...MOCK_LOCATION, accuracy: 10 });
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
                console.warn('[GPS] 위치 조회 실패 -> Mock 좌표 사용:', error.message);
                resolve({ ...MOCK_LOCATION, accuracy: 10 });
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    });
};
