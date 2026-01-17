/**
 * VoiceService - 브라우저 Web Speech API 기반 STT/TTS 서비스
 * 서버 없이 클라이언트에서 100% 실행
 *
 * 나중에 Gemini API나 Solar API 연동 시 processWithAI 함수만 수정하면 됨
 */

class VoiceService {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSupported = this.checkSupport();
        this.onResult = null;
        this.onError = null;
        this.onStateChange = null;
        this.koreanVoice = null;
        this.availableVoices = []; // 사용 가능한 한국어 음성 목록

        // TTS 설정 (자연스러운 음성을 위한 튜닝)
        this.ttsConfig = {
            rate: 0.92,      // 속도: 약간 느리게 (더 자연스러움)
            pitch: 1.0,      // 음높이: 기본
            volume: 1.0      // 볼륨: 최대
        };

        // 초기화
        if (this.isSupported) {
            this.initRecognition();
            this.loadKoreanVoice();
        }
    }

    /**
     * 브라우저 지원 여부 확인
     */
    checkSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const hasSpeechRecognition = !!SpeechRecognition;
        const hasSpeechSynthesis = 'speechSynthesis' in window;

        console.log('[VoiceService] 지원 체크:', {
            STT: hasSpeechRecognition,
            TTS: hasSpeechSynthesis
        });

        return hasSpeechRecognition && hasSpeechSynthesis;
    }

    /**
     * 음성 인식 초기화
     */
    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('[VoiceService] SpeechRecognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ko-KR'; // 한국어
        this.recognition.continuous = true; // 연속 인식
        this.recognition.interimResults = true; // 중간 결과도 받기
        this.recognition.maxAlternatives = 1;

        // 이벤트 핸들러
        this.recognition.onstart = () => {
            console.log('[VoiceService] 음성 인식 시작됨');
            this.isListening = true;
            this.onStateChange?.({ type: 'listening', isListening: true });
        };

        this.recognition.onend = () => {
            console.log('[VoiceService] 음성 인식 종료됨');
            // continuous 모드에서 자동 재시작
            if (this.isListening) {
                console.log('[VoiceService] 자동 재시작...');
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            console.warn('[VoiceService] 재시작 실패:', e.message);
                        }
                    }
                }, 100);
            } else {
                this.onStateChange?.({ type: 'stopped', isListening: false });
            }
        };

        this.recognition.onresult = (event) => {
            const results = event.results;
            const lastResult = results[results.length - 1];

            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.trim();
                const confidence = lastResult[0].confidence;

                console.log('[VoiceService] 인식 결과:', transcript, `(신뢰도: ${(confidence * 100).toFixed(1)}%)`);

                if (transcript) {
                    this.onResult?.({
                        text: transcript,
                        confidence: confidence,
                        isFinal: true
                    });

                    // 에코 모드: 인식된 텍스트를 바로 TTS로 출력
                    this.speak(transcript);
                }
            } else {
                // 중간 결과 (실시간 표시용)
                const interimTranscript = lastResult[0].transcript;
                this.onResult?.({
                    text: interimTranscript,
                    confidence: 0,
                    isFinal: false
                });
            }
        };

        this.recognition.onerror = (event) => {
            console.error('[VoiceService] 인식 에러:', event.error);

            // 특정 에러는 무시 (no-speech 등)
            if (event.error === 'no-speech') {
                console.log('[VoiceService] 음성 없음 - 계속 대기');
                return;
            }

            if (event.error === 'aborted') {
                console.log('[VoiceService] 사용자에 의해 중단됨');
                return;
            }

            this.onError?.({
                type: event.error,
                message: this.getErrorMessage(event.error)
            });
        };
    }

    /**
     * 한국어 음성 로드 (프리미엄 음성 우선 선택)
     */
    loadKoreanVoice() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();

            // 한국어 음성만 필터링
            const koreanVoices = voices.filter(v =>
                v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.startsWith('ko')
            );

            this.availableVoices = koreanVoices;
            console.log('[VoiceService] 사용 가능한 한국어 음성:', koreanVoices.map(v => ({
                name: v.name,
                lang: v.lang,
                local: v.localService
            })));

            // 음성 선택 우선순위 (여성 + 자연스러운 음성 우선)
            // 1. 여성 이름 음성 (Yuna, Sora, SunHi 등)
            // 2. Google 한국어 여성 (온라인, 자연스러움)
            // 3. Microsoft 여성 Neural 음성 (고품질)
            // 4. 온라인 여성 음성
            // 5. 기타

            // 여성 음성 이름 패턴 (한국어)
            const femaleNames = ['Yuna', 'Sora', 'SunHi', 'Heami', 'Minji', 'Jiyun', 'Seoyeon', 'Heera'];
            const isFemaleVoice = (v) => femaleNames.some(name => v.name.includes(name));

            const voicePriority = [
                // Apple 여성 음성 (Yuna, Sora - 가장 자연스러움)
                v => v.name.includes('Yuna') && v.name.includes('Premium'),
                v => v.name.includes('Yuna'),
                v => v.name.includes('Sora'),
                // Microsoft 여성 Neural 음성
                v => isFemaleVoice(v) && (v.name.includes('Online') || v.name.includes('Neural')),
                v => v.name.includes('SunHi'),
                v => v.name.includes('Heami'),
                // Google 한국어 (기본 여성)
                v => v.name.includes('Google') && !v.localService,
                v => v.name.includes('Google'),
                // 기타 여성 음성
                v => isFemaleVoice(v),
                // Microsoft 온라인 음성
                v => v.name.includes('Online') || v.name.includes('Neural'),
                v => v.name.includes('Microsoft') && !v.localService,
                // 온라인 음성 우선 (더 자연스러움)
                v => !v.localService,
                // 나머지
                v => true
            ];

            for (const condition of voicePriority) {
                const found = koreanVoices.find(condition);
                if (found) {
                    this.koreanVoice = found;
                    break;
                }
            }

            if (this.koreanVoice) {
                console.log('[VoiceService] 선택된 음성:', {
                    name: this.koreanVoice.name,
                    lang: this.koreanVoice.lang,
                    local: this.koreanVoice.localService,
                    uri: this.koreanVoice.voiceURI
                });
            } else {
                console.warn('[VoiceService] 한국어 음성을 찾을 수 없습니다. 기본 음성 사용');
            }
        };

        // 음성 목록이 비동기로 로드될 수 있음
        if (this.synthesis.getVoices().length > 0) {
            loadVoices();
        } else {
            this.synthesis.onvoiceschanged = loadVoices;
        }

        // 일부 브라우저에서 onvoiceschanged가 안 불리는 경우 대비
        setTimeout(() => {
            if (!this.koreanVoice && this.synthesis.getVoices().length > 0) {
                loadVoices();
            }
        }, 500);
    }

    /**
     * 에러 메시지 변환
     */
    getErrorMessage(error) {
        const messages = {
            'not-allowed': '마이크 권한이 필요합니다. 설정에서 마이크 권한을 허용해주세요.',
            'no-speech': '음성이 감지되지 않았습니다.',
            'audio-capture': '마이크를 사용할 수 없습니다.',
            'network': '네트워크 오류가 발생했습니다.',
            'aborted': '음성 인식이 중단되었습니다.',
            'language-not-supported': '지원되지 않는 언어입니다.'
        };
        return messages[error] || `음성 인식 오류: ${error}`;
    }

    /**
     * 음성 인식 시작
     */
    start() {
        if (!this.isSupported) {
            console.error('[VoiceService] 음성 서비스가 지원되지 않습니다');
            this.onError?.({
                type: 'not-supported',
                message: '이 브라우저에서는 음성 인식이 지원되지 않습니다.'
            });
            return false;
        }

        if (this.isListening) {
            console.warn('[VoiceService] 이미 인식 중입니다');
            return true;
        }

        try {
            this.isListening = true;
            this.recognition.start();
            console.log('[VoiceService] 음성 인식 시작 요청');
            return true;
        } catch (error) {
            console.error('[VoiceService] 시작 실패:', error);
            this.isListening = false;
            this.onError?.({
                type: 'start-error',
                message: error.message
            });
            return false;
        }
    }

    /**
     * 음성 인식 중지
     */
    stop() {
        if (!this.recognition) return;

        console.log('[VoiceService] 음성 인식 중지 요청');
        this.isListening = false;

        try {
            this.recognition.stop();
        } catch (e) {
            console.warn('[VoiceService] 중지 중 오류:', e.message);
        }

        // TTS도 중지
        this.synthesis.cancel();

        this.onStateChange?.({ type: 'stopped', isListening: false });
    }

    /**
     * TTS로 텍스트 읽기 (자연스러운 음성 설정 적용)
     */
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.error('[VoiceService] TTS not supported');
            return;
        }

        // 현재 재생 중인 음성 취소
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';

        // 튜닝된 기본 설정 사용 (옵션으로 덮어쓰기 가능)
        utterance.rate = options.rate ?? this.ttsConfig.rate;
        utterance.pitch = options.pitch ?? this.ttsConfig.pitch;
        utterance.volume = options.volume ?? this.ttsConfig.volume;

        // 한국어 음성 사용
        if (this.koreanVoice) {
            utterance.voice = this.koreanVoice;
        }

        // 이벤트
        utterance.onstart = () => {
            console.log('[VoiceService] TTS 시작:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
            this.onStateChange?.({ type: 'speaking', text });
        };

        utterance.onend = () => {
            console.log('[VoiceService] TTS 완료');
            this.onStateChange?.({ type: 'speakEnd' });
        };

        utterance.onerror = (event) => {
            console.error('[VoiceService] TTS 에러:', event.error);
            this.onStateChange?.({ type: 'speakEnd' }); // 에러 시에도 상태 복구
        };

        this.synthesis.speak(utterance);
    }

    /**
     * TTS 설정 변경
     */
    setTTSConfig(config) {
        if (config.rate !== undefined) this.ttsConfig.rate = Math.max(0.1, Math.min(2, config.rate));
        if (config.pitch !== undefined) this.ttsConfig.pitch = Math.max(0, Math.min(2, config.pitch));
        if (config.volume !== undefined) this.ttsConfig.volume = Math.max(0, Math.min(1, config.volume));
        console.log('[VoiceService] TTS 설정 변경:', this.ttsConfig);
    }

    /**
     * 사용 가능한 한국어 음성 목록 반환
     */
    getAvailableVoices() {
        return this.availableVoices;
    }

    /**
     * 특정 음성으로 변경
     */
    setVoice(voiceName) {
        const voice = this.availableVoices.find(v => v.name === voiceName);
        if (voice) {
            this.koreanVoice = voice;
            console.log('[VoiceService] 음성 변경됨:', voice.name);
            return true;
        }
        console.warn('[VoiceService] 음성을 찾을 수 없음:', voiceName);
        return false;
    }

    /**
     * 현재 상태 반환
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            isListening: this.isListening,
            isSpeaking: this.synthesis?.speaking || false,
            hasKoreanVoice: !!this.koreanVoice
        };
    }

    /**
     * 콜백 설정
     */
    setCallbacks({ onResult, onError, onStateChange }) {
        if (onResult) this.onResult = onResult;
        if (onError) this.onError = onError;
        if (onStateChange) this.onStateChange = onStateChange;
    }

    /**
     * AI 처리 함수 (나중에 Gemini/Solar API 연동용)
     * 현재는 에코 모드 (입력 그대로 반환)
     */
    async processWithAI(text) {
        // TODO: Gemini API나 Solar API 연동 시 이 함수 수정
        // 현재는 에코 모드
        return text;
    }
}

// 싱글톤 인스턴스
export const voiceService = new VoiceService();

export default VoiceService;
