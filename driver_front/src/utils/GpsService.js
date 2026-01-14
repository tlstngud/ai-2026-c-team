/**
 * GPS + 가속도 센서 기반 차량 모니터링 서비스
 * - GPS: 속도 표시용
 * - 가속도 센서: 급가속/급감속 감지용 (더 정확)
 */

// G-Force 임계값 (1G ≈ 9.8m/s²)
// 실제 자동차 운전 기준으로 조정 (더 엄격한 기준)
const HARD_ACCEL_THRESHOLD = 4.5; // m/s² (급가속) - 기존 3.5에서 상향
const HARD_BRAKE_THRESHOLD = -5.5; // m/s² (급감속) - 기존 -4.5에서 상향 (브레이크가 더 강함)
const MIN_SPEED_FOR_MOTION = 10; // km/h (이 속도 이상일 때만 가속도 센서 판단)

// TMAP API 설정
const TMAP_API_KEY = '49sDimr9yt5PxoX30zQq481OCuwcUNDV6D2cbXs3';
const TMAP_API_VERSION = '1'; // API 버전
// TMAP NearToRoad API 엔드포인트 (가까운 도로 찾기)
const TMAP_NEAR_TO_ROAD_API_URL = `https://apis.openapi.sk.com/tmap/road/nearToRoad`;
const SPEED_LIMIT_CHECK_INTERVAL = 5000; // 5초마다 제한 속도 조회

// 테스트 좌표 (정확한 도로 한 가운데 위치)
// 올림픽대로
const TEST_COORDINATES = {
    latitude: 37.5162,
    longitude: 126.9226,
    enabled: true // true로 설정하면 실제 GPS 대신 이 좌표 사용 (테스트용)
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
        console.log('🗺️ TMAP NearToRoad API 요청 시작:', {
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            url: fullUrl
        });

        // CORS 및 네트워크 오류 처리
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

        // TMAP NearToRoad API 요청 (GET Method)
        // 정확한 요청 형식:
        // - Method: GET
        // - Query Parameters: version, appKey, lat, lon
        // - Accept: application/json

        console.log('📝 TMAP API 요청 Query Parameters:', {
            version: TMAP_API_VERSION,
            appKey: TMAP_API_KEY.substring(0, 10) + '...',
            lat: latitude.toString(),
            lon: longitude.toString()
        });

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('📡 TMAP API 응답 상태:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        // 204 No Content 처리 (검색 결과가 없는 경우)
        if (response.status === 204) {
            console.warn('⚠️ TMAP API: 204 No Content - 검색 결과가 없습니다', {
                가능한원인: [
                    '요청한 좌표가 도로가 아닌 곳 (실내, 건물, 공원 등)',
                    '검색 결과 자체가 없음',
                    '잘못된 좌표 또는 대한민국을 벗어난 좌표',
                    '리버스 지오코딩 사용 시 좌표 오류'
                ]
            });
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

            console.error('❌ TMAP API 400 오류:', {
                status: response.status,
                statusText: response.statusText,
                errorMessage: errorMessage,
                errorCode: errorCode,
                body: errorText,
                가능한원인: [
                    '좌표 형식 오류 (문자 포함, 범위 초과)',
                    '좌표계 오류 (WGS84 외 사용)',
                    'X,Y 좌표 반대 입력',
                    '필수 파라미터 누락',
                    '제공되지 않는 주소 범위',
                    '잘못된 주소 형식'
                ]
            });

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
            console.error('❌ TMAP API 500 오류: 시스템 오류', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
                errorCode: '1005'
            });
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
            console.error('❌ TMAP API 오류:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
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

        // 응답 텍스트 먼저 확인 (디버깅)
        const responseText = await response.text();
        console.log('📄 TMAP API 응답 텍스트 (원본):', responseText);

        // 빈 응답 처리
        if (!responseText || responseText.trim() === '') {
            console.warn('⚠️ TMAP API: 응답 본문이 비어있습니다');
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
            console.log('📦 TMAP API 응답 데이터 (파싱됨):', data);
        } catch (parseError) {
            console.error('❌ JSON 파싱 오류:', parseError);
            console.error('응답 텍스트:', responseText);
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

        // 응답 구조 확인
        console.log('🔍 응답 데이터 최상위 키:', Object.keys(data));
        console.log('🔍 data.resultData 존재 여부:', !!data.resultData);

        if (data.resultData) {
            const header = data.resultData.header || {};

            console.log('📊 TMAP NearToRoad API 응답 구조:', {
                header존재: !!header,
                header키: Object.keys(header),
                speed: header.speed,
                roadName: header.roadName,
                linkId: header.linkId,
                roadCategory: header.roadCategory,
                totalDistance: header.totalDistance,
                resultData키: Object.keys(data.resultData)
            });

            // header에서 직접 데이터 추출
            if (header) {
                // 디버깅: header의 모든 필드 확인
                console.log('🔍 header 상세 정보:', {
                    전체객체: header,
                    모든키: Object.keys(header),
                    speed: header.speed,
                    speed타입: typeof header.speed,
                    roadName: header.roadName,
                    linkId: header.linkId,
                    roadCategory: header.roadCategory
                });

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

                console.log('✅ TMAP NearToRoad API 성공 - 파싱 결과:', {
                    원본speed: header.speed,
                    speed타입: typeof header.speed,
                    파싱된제한속도: result.speedLimit,
                    제한속도타입: typeof result.speedLimit,
                    제한속도표시: result.speedLimit ? `${result.speedLimit}km/h` : '없음',
                    원본roadCategory: header.roadCategory,
                    roadCategory타입: typeof header.roadCategory,
                    원본roadName: header.roadName,
                    파싱된도로명: result.roadName || '없음',
                    도로ID: result.roadId || '없음',
                    결과객체전체: result,
                    header전체필드: Object.keys(header),
                    header원본: header
                });

                return result;
            } else {
                // header가 없는 경우
                console.warn('⚠️ TMAP NearToRoad API: header가 응답에 없음', {
                    resultData키: Object.keys(data.resultData),
                    가능한원인: [
                        '1. 요청한 좌표가 도로가 아닌 곳 (실내, 건물, 공원 등)',
                        '2. 데스크탑 환경에서 GPS 좌표가 부정확함',
                        '3. 해당 위치에 도로 데이터가 없음',
                        '4. 좌표가 해외 지역이거나 TMAP 데이터 범위 밖'
                    ],
                    해결방법: [
                        '실제 차량 운전 중 야외에서 테스트',
                        '도로 위의 정확한 GPS 좌표 사용',
                        '다른 좌표로 재시도'
                    ],
                    전체응답: JSON.stringify(data).substring(0, 1000)
                });
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
        console.error('❌ TMAP API: resultData가 응답에 없음', {
            응답키: Object.keys(data),
            응답데이터전체: data,
            전체응답JSON: JSON.stringify(data).substring(0, 1000)
        });
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

    // 데스크탑/노트북 환경 감지
    const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;
    if (isDesktop) {
        console.log('💻 데스크탑 환경 감지: GPS 속도는 0으로 표시될 수 있습니다.');
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
            // 처음 몇 번만 로그
            if (motionEventCount <= 3) {
                console.log('⚠️ 가속도 데이터 없음', { event });
            }
            return;
        }

        // 디버깅: 가속도 값 확인 (처음 5번 + 이후 1% 확률)
        if (motionEventCount <= 5 || Math.random() < 0.01) {
            console.log('📱 가속도 센서 데이터:', {
                x: accel.x !== undefined && accel.x !== null ? accel.x.toFixed(2) : 'undefined',
                y: accel.y !== undefined && accel.y !== null ? accel.y.toFixed(2) : 'undefined',
                z: accel.z !== undefined && accel.z !== null ? accel.z.toFixed(2) : 'undefined',
                speed: (lastSpeedKmh !== null && lastSpeedKmh !== undefined) ? lastSpeedKmh.toFixed(1) + ' km/h' : '0.0 km/h',
                count: motionEventCount,
                원본이벤트: event // 디버깅용
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
                speed: (lastSpeedKmh !== null && lastSpeedKmh !== undefined) ? lastSpeedKmh.toFixed(1) + ' km/h' : '0.0 km/h',
                testMode: isTestMode,
                axis: absX >= absY && absX >= absZ ? 'X' : (absY >= absX && absY >= absZ ? 'Y' : 'Z')
            });
        } else if (mainAccel < HARD_BRAKE_THRESHOLD) {
            isHardBrake = true;
            console.log('🛑 급감속 감지!', {
                accel: mainAccel.toFixed(2) + ' m/s²',
                speed: (lastSpeedKmh !== null && lastSpeedKmh !== undefined) ? lastSpeedKmh.toFixed(1) + ' km/h' : '0.0 km/h',
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
    // position.coords.speed를 직접 사용하는 것이 가장 정확 (도플러 효과 기반)
    // 거리 기반 계산은 GPS 오차(Drift) 때문에 부정확하므로 사용하지 않음
    const options = {
        enableHighAccuracy: true, // 배터리 더 쓰더라도 가장 정확한 모드 사용
        timeout: 10000,
        maximumAge: 0 // 캐시된 위치 절대 사용 안 함 (실시간성 중요)
    };

    gpsWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, speed: gpsSpeed, accuracy } = position.coords;
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

            // 디버깅: 정확도와 속도 로그 (처음 몇 번만)
            if (Math.random() < 0.05) { // 5% 확률
                console.log('📍 GPS 상태:', {
                    speed: currentSpeedKmh.toFixed(1) + ' km/h',
                    accuracy: accuracy ? accuracy.toFixed(0) + 'm' : 'N/A',
                    status: gpsStatus
                });
            }

            lastSpeedKmh = currentSpeedKmh;

            // TMAP API로 제한 속도 조회 (5초마다 한 번만)
            // 테스트 모드: TEST_COORDINATES.enabled가 true이면 테스트 좌표만 사용 (GPS 조건 무시)
            const useTestCoords = TEST_COORDINATES.enabled;

            if (useTestCoords) {
                // 테스트 모드: GPS 조건 무시하고 항상 테스트 좌표 사용
                if ((currentTime - lastSpeedLimitCheck) > SPEED_LIMIT_CHECK_INTERVAL) {
                    lastSpeedLimitCheck = currentTime;

                    console.log('🧪 테스트 모드: 제한 속도 조회 시작 (테스트 좌표만 사용):', {
                        위도: TEST_COORDINATES.latitude.toFixed(6),
                        경도: TEST_COORDINATES.longitude.toFixed(6),
                        위치: '올림픽대로 (도로 한 가운데)',
                        GPS조건: '무시됨'
                    });

                    // 조회 시작 알림
                    onUpdate({
                        type: 'SPEED_LIMIT_LOADING'
                    });

                    // 비동기로 제한 속도 조회 (블로킹 방지) - 테스트 좌표 사용
                    getSpeedLimitFromTmap(TEST_COORDINATES.latitude, TEST_COORDINATES.longitude).then(result => {
                        const prevLimit = currentSpeedLimit;
                        const prevRoad = currentRoadName;

                        // 결과 상세 로그 (항상 출력)
                        console.log('🔍 TMAP API 조회 결과 상세:', {
                            result객체: result,
                            speedLimit: result.speedLimit,
                            speedLimit타입: typeof result.speedLimit,
                            speedLimit값존재: result.speedLimit !== null && result.speedLimit !== undefined,
                            roadName: result.roadName,
                            roadId: result.roadId,
                            이전제한속도: prevLimit,
                            이전도로명: prevRoad
                        });

                        currentSpeedLimit = result.speedLimit;
                        currentRoadName = result.roadName;

                        // 결과가 없어도 로그 출력
                        if (!result.speedLimit && !result.roadName) {
                            console.warn('⚠️ TMAP API: 제한 속도와 도로명 모두 없음', {
                                위도: TEST_COORDINATES.latitude.toFixed(6),
                                경도: TEST_COORDINATES.longitude.toFixed(6),
                                위치: '올림픽대로 (테스트 좌표)',
                                result객체: result,
                                가능한원인: 'matchedPoints 배열이 비어있거나 도로 매칭 실패'
                            });
                        }

                        // 변경사항이 있을 때만 로그
                        if (prevLimit !== currentSpeedLimit || prevRoad !== currentRoadName) {
                            console.log('🛣️ 제한 속도 업데이트:', {
                                이전: prevLimit ? `${prevLimit}km/h (${prevRoad})` : '없음',
                                현재: currentSpeedLimit ? `${currentSpeedLimit}km/h (${currentRoadName})` : '없음',
                                업데이트여부: '변경됨',
                                speedLimit값: currentSpeedLimit,
                                speedLimit타입: typeof currentSpeedLimit
                            });
                        } else {
                            console.log('ℹ️ 제한 속도 변경 없음:', {
                                현재값: currentSpeedLimit ? `${currentSpeedLimit}km/h (${currentRoadName})` : '없음',
                                speedLimit값: currentSpeedLimit
                            });
                        }

                        // 제한 속도 업데이트를 콜백으로 전달 (null이어도 전달)
                        // 디버깅 정보도 함께 전달
                        onUpdate({
                            type: 'SPEED_LIMIT',
                            speedLimit: currentSpeedLimit,
                            roadName: currentRoadName,
                        rawResponse: result.rawResponse, // 디버깅용
                        headerKeys: result.headerKeys, // 디버깅용: header의 모든 키
                        headerRaw: result.headerRaw, // 디버깅용: header 원본 데이터
                        matchedPointKeys: result.headerKeys, // 호환성을 위해 유지
                        matchedPointRaw: result.headerRaw, // 호환성을 위해 유지
                            error: result.error, // 디버깅용
                            errorCode: result.errorCode, // 에러 코드 (있는 경우)
                            responseKeys: result.responseKeys, // 디버깅용
                            requestInfo: result.requestInfo // 디버깅용: 요청 정보
                        });
                    }).catch(error => {
                        console.error('❌ 제한 속도 조회 중 오류:', error);
                        console.error('오류 상세:', {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        });
                        // 오류 발생 시에도 로딩 상태 해제
                        onUpdate({
                            type: 'SPEED_LIMIT',
                            speedLimit: null,
                            roadName: null
                        });
                    });
                }
            } else {
                // 실제 GPS 모드: GPS 조건 확인 후 조회
                if ((currentTime - lastSpeedLimitCheck) > SPEED_LIMIT_CHECK_INTERVAL &&
                    latitude && longitude && accuracy && accuracy < 100) {
                    // 정확도가 좋을 때만 조회 (100m 이내로 완화)
                    lastSpeedLimitCheck = currentTime;

                    console.log('🔄 제한 속도 조회 시작 (5초 간격):', {
                        위도: latitude.toFixed(6),
                        경도: longitude.toFixed(6),
                        정확도: accuracy.toFixed(0) + 'm',
                        모드: '실제 GPS 사용'
                    });

                    // 조회 시작 알림
                    onUpdate({
                        type: 'SPEED_LIMIT_LOADING'
                    });

                    // 비동기로 제한 속도 조회 (블로킹 방지)
                    getSpeedLimitFromTmap(latitude, longitude).then(result => {
                        const prevLimit = currentSpeedLimit;
                        const prevRoad = currentRoadName;

                        // 결과 상세 로그 (항상 출력)
                        console.log('🔍 TMAP API 조회 결과 상세:', {
                            result객체: result,
                            speedLimit: result.speedLimit,
                            speedLimit타입: typeof result.speedLimit,
                            speedLimit값존재: result.speedLimit !== null && result.speedLimit !== undefined,
                            roadName: result.roadName,
                            roadId: result.roadId,
                            이전제한속도: prevLimit,
                            이전도로명: prevRoad
                        });

                        currentSpeedLimit = result.speedLimit;
                        currentRoadName = result.roadName;

                        // 결과가 없어도 로그 출력
                        if (!result.speedLimit && !result.roadName) {
                            console.warn('⚠️ TMAP API: 제한 속도와 도로명 모두 없음', {
                                위도: latitude.toFixed(6),
                                경도: longitude.toFixed(6),
                                정확도: accuracy.toFixed(0) + 'm',
                                result객체: result,
                                가능한원인: 'matchedPoints 배열이 비어있거나 도로 매칭 실패'
                            });
                        }

                        // 변경사항이 있을 때만 로그
                        if (prevLimit !== currentSpeedLimit || prevRoad !== currentRoadName) {
                            console.log('🛣️ 제한 속도 업데이트:', {
                                이전: prevLimit ? `${prevLimit}km/h (${prevRoad})` : '없음',
                                현재: currentSpeedLimit ? `${currentSpeedLimit}km/h (${currentRoadName})` : '없음',
                                업데이트여부: '변경됨',
                                speedLimit값: currentSpeedLimit,
                                speedLimit타입: typeof currentSpeedLimit
                            });
                        } else {
                            console.log('ℹ️ 제한 속도 변경 없음:', {
                                현재값: currentSpeedLimit ? `${currentSpeedLimit}km/h (${currentRoadName})` : '없음',
                                speedLimit값: currentSpeedLimit
                            });
                        }

                        // 제한 속도 업데이트를 콜백으로 전달 (null이어도 전달)
                        // 디버깅 정보도 함께 전달
                        onUpdate({
                            type: 'SPEED_LIMIT',
                            speedLimit: currentSpeedLimit,
                            roadName: currentRoadName,
                        rawResponse: result.rawResponse, // 디버깅용
                        headerKeys: result.headerKeys, // 디버깅용: header의 모든 키
                        headerRaw: result.headerRaw, // 디버깅용: header 원본 데이터
                        matchedPointKeys: result.headerKeys, // 호환성을 위해 유지
                        matchedPointRaw: result.headerRaw, // 호환성을 위해 유지
                            error: result.error, // 디버깅용
                            errorCode: result.errorCode, // 에러 코드 (있는 경우)
                            responseKeys: result.responseKeys, // 디버깅용
                            requestInfo: result.requestInfo // 디버깅용: 요청 정보
                        });
                    }).catch(error => {
                        console.error('❌ 제한 속도 조회 중 오류:', error);
                        console.error('오류 상세:', {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        });
                        // 오류 발생 시에도 로딩 상태 해제
                        onUpdate({
                            type: 'SPEED_LIMIT',
                            speedLimit: null,
                            roadName: null
                        });
                    });
                }
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
                speed: Math.floor(currentSpeedKmh), // 정수로 변환
                accuracy: accuracy ? Math.floor(accuracy) : null,
                isOverspeed,
                status: gpsStatus, // GPS 상태 메시지
                speedLimit: currentSpeedLimit, // 현재 도로 제한 속도
                roadName: currentRoadName // 현재 도로명
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
