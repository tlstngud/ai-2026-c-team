/**
 * VoiceService - STT/TTS 서비스
 *
 * STT: Web Speech API (SpeechRecognition)
 * TTS: Web Speech API (SpeechSynthesis) - 안정적인 브라우저 내장 음성
 *
 * 서버 없이 클라이언트에서 100% 실행
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
        this.englishVoice = null;
        this.availableVoices = [];
        this.currentLang = 'ko-KR'; // 현재 인식 언어

        // TTS 엔진 상태 (Web Speech API만 사용)
        this.ttsEngine = 'web-speech';
        this.supertonicReady = false;
        this.supertonicLoading = false;
        this.supertonicLoadError = null;

        // TTS 설정
        this.ttsConfig = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        };

        // 초기화
        if (this.isSupported) {
            this.initRecognition();
            this.loadVoices();
            console.log('[VoiceService] Web Speech API 사용 (한국어/영어 지원)');
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
        // 한국어를 기본으로 설정하되, 영어도 인식 가능하도록 설정
        this.recognition.lang = this.currentLang;
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            console.log('[VoiceService] 음성 인식 시작됨');
            this.isListening = true;
            this.onStateChange?.({ type: 'listening', isListening: true });
        };

        this.recognition.onend = () => {
            console.log('[VoiceService] 음성 인식 종료됨');
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

                // 언어 감지: 한글이 포함되어 있으면 한국어, 아니면 영어
                const detectedLang = this.detectLanguage(transcript);
                console.log('[VoiceService] 인식 결과:', transcript, `(언어: ${detectedLang}, 신뢰도: ${(confidence * 100).toFixed(1)}%)`);

                if (transcript) {
                    this.onResult?.({
                        text: transcript,
                        confidence: confidence,
                        isFinal: true,
                        lang: detectedLang
                    });

                    // [수정] 에코 모드 제거 (운전 중 잡음/경고 방송 겹침 방지)
                    // this.speak(transcript, { lang: detectedLang });
                }
            } else {
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
     * 언어 감지: 한글 포함 여부로 판단
     */
    detectLanguage(text) {
        // 한글 유니코드 범위: 가-힣, ㄱ-ㅎ, ㅏ-ㅣ
        const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
        return koreanRegex.test(text) ? 'ko-KR' : 'en-US';
    }

    /**
     * 언어 전환 (STT 인식 언어 변경)
     */
    setLanguage(lang) {
        if (lang === 'ko-KR' || lang === 'en-US') {
            this.currentLang = lang;
            if (this.recognition) {
                this.recognition.lang = lang;
            }
            console.log('[VoiceService] 인식 언어 변경:', lang);
        }
    }

    /**
     * 한국어/영어 음성 로드 (Web Speech API용)
     */
    loadVoices() {
        const loadVoicesInternal = () => {
            const voices = this.synthesis.getVoices();

            // 한국어 음성 필터링
            const koreanVoices = voices.filter(v =>
                v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.startsWith('ko')
            );

            // 영어 음성 필터링
            const englishVoices = voices.filter(v =>
                v.lang === 'en-US' || v.lang === 'en_US' || v.lang === 'en-GB' || v.lang.startsWith('en')
            );

            this.availableVoices = [...koreanVoices, ...englishVoices];

            console.log('[VoiceService] 사용 가능한 음성:', {
                korean: koreanVoices.length,
                english: englishVoices.length
            });

            // 한국어 음성 선택 (여성 음성 우선)
            const koreanFemaleNames = ['Yuna', 'Sora', 'SunHi', 'Heami', 'Minji', 'Jiyun', 'Seoyeon', 'Heera'];
            const isKoreanFemale = (v) => koreanFemaleNames.some(name => v.name.includes(name));

            const koreanPriority = [
                v => v.name.includes('Yuna') && v.name.includes('Premium'),
                v => v.name.includes('Yuna'),
                v => v.name.includes('Sora'),
                v => isKoreanFemale(v) && (v.name.includes('Online') || v.name.includes('Neural')),
                v => v.name.includes('Google') && !v.localService,
                v => v.name.includes('Google'),
                v => isKoreanFemale(v),
                v => !v.localService,
                v => true
            ];

            for (const condition of koreanPriority) {
                const found = koreanVoices.find(condition);
                if (found) {
                    this.koreanVoice = found;
                    break;
                }
            }

            // 영어 음성 선택 (여성 음성 우선)
            const englishFemaleNames = ['Samantha', 'Karen', 'Victoria', 'Allison', 'Susan', 'Zira', 'Hazel', 'Aria'];
            const isEnglishFemale = (v) => englishFemaleNames.some(name => v.name.includes(name));

            const englishPriority = [
                v => v.name.includes('Samantha') && v.name.includes('Premium'),
                v => v.name.includes('Samantha'),
                v => isEnglishFemale(v) && (v.name.includes('Online') || v.name.includes('Neural')),
                v => v.name.includes('Google') && v.lang === 'en-US' && !v.localService,
                v => v.name.includes('Google') && v.lang === 'en-US',
                v => isEnglishFemale(v),
                v => v.lang === 'en-US' && !v.localService,
                v => v.lang === 'en-US',
                v => true
            ];

            for (const condition of englishPriority) {
                const found = englishVoices.find(condition);
                if (found) {
                    this.englishVoice = found;
                    break;
                }
            }

            if (this.koreanVoice) {
                console.log('[VoiceService] 선택된 한국어 음성:', this.koreanVoice.name);
            }
            if (this.englishVoice) {
                console.log('[VoiceService] 선택된 영어 음성:', this.englishVoice.name);
            }
        };

        if (this.synthesis.getVoices().length > 0) {
            loadVoicesInternal();
        } else {
            this.synthesis.onvoiceschanged = loadVoicesInternal;
        }

        setTimeout(() => {
            if ((!this.koreanVoice || !this.englishVoice) && this.synthesis.getVoices().length > 0) {
                loadVoicesInternal();
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

        this.synthesis.cancel();
        this.onStateChange?.({ type: 'stopped', isListening: false });
    }

    /**
     * TTS로 텍스트 읽기 (Web Speech API)
     * 무한 재귀 방지: TTS 중에는 STT 완전 중지
     */
    speak(text, options = {}) {
        // TTS 시작 전 STT 완전 중지 (무한 재귀 방지)
        const wasListening = this.isListening;
        if (wasListening && this.recognition) {
            // isListening을 false로 설정하여 자동 재시작 방지
            this.isListening = false;
            try {
                this.recognition.stop();
                console.log('[VoiceService] TTS 시작 - STT 완전 중지');
            } catch (e) {
                // 이미 중지된 경우 무시
            }
        }

        this.speakWithWebSpeech(text, { ...options, wasListening });
    }

    /**
     * Web Speech API로 TTS
     */
    speakWithWebSpeech(text, options = {}) {
        if (!this.synthesis) {
            console.error('[VoiceService] TTS not supported');
            return;
        }

        // Chrome 버그 해결: speechSynthesis가 stuck 상태일 때 resume() 필요
        this.synthesis.cancel();
        this.synthesis.resume();

        // cancel() 후 약간의 딜레이 (브라우저 호환성)
        setTimeout(() => {
            this._doSpeak(text, options);
        }, 50);
    }

    /**
     * 실제 TTS 실행 (내부 함수)
     */
    _doSpeak(text, options = {}) {
        if (!this.synthesis) return;

        // 언어 감지 또는 옵션에서 언어 결정
        const lang = options.lang || this.detectLanguage(text);
        const isKorean = lang === 'ko-KR';

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = options.rate ?? this.ttsConfig.rate;
        utterance.pitch = options.pitch ?? this.ttsConfig.pitch;
        utterance.volume = options.volume ?? this.ttsConfig.volume;

        // 언어에 맞는 음성 선택
        if (isKorean && this.koreanVoice) {
            utterance.voice = this.koreanVoice;
        } else if (!isKorean && this.englishVoice) {
            utterance.voice = this.englishVoice;
        }

        utterance.onstart = () => {
            console.log(`[VoiceService] TTS 시작 (${lang}):`, text.substring(0, 30) + (text.length > 30 ? '...' : ''));
            this.onStateChange?.({ type: 'speaking', text, engine: 'web-speech', lang });
        };

        utterance.onend = () => {
            console.log('[VoiceService] Web Speech TTS 완료');
            this.onStateChange?.({ type: 'speakEnd' });

            // TTS 완료 후 STT 재시작 (1초 딜레이로 에코 완전 방지)
            if (options.wasListening) {
                setTimeout(() => {
                    this.isListening = true;
                    try {
                        this.recognition.start();
                        console.log('[VoiceService] TTS 완료 - STT 재시작');
                    } catch (e) {
                        console.warn('[VoiceService] STT 재시작 실패:', e.message);
                        this.isListening = false;
                    }
                }, 1000); // 1초 딜레이로 에코 완전 방지
            }
        };

        utterance.onerror = (event) => {
            console.error('[VoiceService] Web Speech TTS 에러:', event.error);
            this.onStateChange?.({ type: 'speakEnd' });

            // 에러 시에도 STT 재시작
            if (options.wasListening) {
                setTimeout(() => {
                    this.isListening = true;
                    try {
                        this.recognition.start();
                    } catch (e) {
                        this.isListening = false;
                    }
                }, 1000);
            }
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
     * 현재 상태 반환
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            isListening: this.isListening,
            isSpeaking: this.synthesis?.speaking || false,
            hasKoreanVoice: !!this.koreanVoice,
            hasEnglishVoice: !!this.englishVoice,
            currentLang: this.currentLang,
            ttsEngine: this.ttsEngine,
            supertonicReady: this.supertonicReady,
            supertonicLoading: this.supertonicLoading
        };
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
     * 콜백 설정
     */
    setCallbacks({ onResult, onError, onStateChange }) {
        if (onResult) this.onResult = onResult;
        if (onError) this.onError = onError;
        if (onStateChange) this.onStateChange = onStateChange;
    }

    /**
     * AI 처리 함수 (나중에 Gemini/Solar API 연동용)
     */
    async processWithAI(text) {
        // TODO: Gemini API나 Solar API 연동 시 이 함수 수정
        return text;
    }
}

// 싱글톤 인스턴스
export const voiceService = new VoiceService();

export default VoiceService;
