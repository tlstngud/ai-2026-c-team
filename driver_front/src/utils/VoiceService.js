/**
 * VoiceService - 적응형 하이브리드 STT/TTS 서비스
 *
 * 고사양 기기: Supertonic 2 (Transformers.js) - 고품질 AI 음성
 * 저사양 기기: Web Speech API - 브라우저 내장 음성
 *
 * 서버 없이 클라이언트에서 100% 실행
 * 나중에 Gemini API나 Solar API 연동 시 processWithAI 함수만 수정하면 됨
 */

// Supertonic 2 모델을 위한 동적 import (필요시에만 로드)
let pipeline = null;
let synthesizer = null;

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
        this.availableVoices = [];

        // TTS 엔진 상태
        this.ttsEngine = 'web-speech'; // 'web-speech' | 'supertonic'
        this.supertonicReady = false;
        this.supertonicLoading = false;
        this.supertonicLoadError = null;

        // 기기 성능 정보
        this.deviceInfo = this.checkDevicePerformance();

        // TTS 설정
        this.ttsConfig = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        };

        // 초기화
        if (this.isSupported) {
            this.initRecognition();
            this.loadKoreanVoice();

            // 고사양 기기에서만 Supertonic 2 백그라운드 로드
            if (this.deviceInfo.isHighEnd) {
                this.loadSupertonicInBackground();
            } else {
                console.log('[VoiceService] 저사양 기기 감지 - Web Speech API만 사용');
            }
        }
    }

    /**
     * 기기 성능 감지
     */
    checkDevicePerformance() {
        const memory = navigator.deviceMemory || 4; // GB (기본값 4GB)
        const cores = navigator.hardwareConcurrency || 4; // CPU 코어 수
        const hasWebGPU = !!navigator.gpu;

        // 고사양 기준: 메모리 4GB 이상 AND 코어 4개 이상
        const isHighEnd = memory >= 4 && cores >= 4;

        const info = {
            memory,
            cores,
            hasWebGPU,
            isHighEnd,
            reason: isHighEnd
                ? `고사양 (${memory}GB RAM, ${cores} cores${hasWebGPU ? ', WebGPU' : ''})`
                : `저사양 (${memory}GB RAM, ${cores} cores)`
        };

        console.log('[VoiceService] 기기 성능:', info);
        return info;
    }

    /**
     * Supertonic 2 백그라운드 로드 (UI 블로킹 없음)
     */
    async loadSupertonicInBackground() {
        if (this.supertonicLoading || this.supertonicReady) return;

        this.supertonicLoading = true;
        console.log('[VoiceService] Supertonic 2 모델 백그라운드 로드 시작...');

        try {
            // 동적 import로 필요시에만 Transformers.js 로드
            const transformers = await import('@huggingface/transformers');
            pipeline = transformers.pipeline;

            // Supertonic 2 TTS 파이프라인 생성
            // 한국어 여성 음성 (F1)을 기본으로 사용
            synthesizer = await pipeline(
                'text-to-speech',
                'onnx-community/Supertonic-TTS-2-ONNX',
                {
                    device: this.deviceInfo.hasWebGPU ? 'webgpu' : 'wasm',
                    dtype: 'fp32'
                }
            );

            this.supertonicReady = true;
            this.ttsEngine = 'supertonic';
            console.log('[VoiceService] ✅ Supertonic 2 모델 로드 완료! 고품질 TTS 활성화');

        } catch (error) {
            console.warn('[VoiceService] ⚠️ Supertonic 2 로드 실패, Web Speech API 사용:', error.message);
            this.supertonicLoadError = error.message;
            this.ttsEngine = 'web-speech';
        } finally {
            this.supertonicLoading = false;
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
        this.recognition.lang = 'ko-KR';
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
     * 한국어 음성 로드 (Web Speech API용)
     */
    loadKoreanVoice() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();
            const koreanVoices = voices.filter(v =>
                v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.startsWith('ko')
            );

            this.availableVoices = koreanVoices;
            console.log('[VoiceService] 사용 가능한 한국어 음성:', koreanVoices.map(v => ({
                name: v.name,
                lang: v.lang,
                local: v.localService
            })));

            const femaleNames = ['Yuna', 'Sora', 'SunHi', 'Heami', 'Minji', 'Jiyun', 'Seoyeon', 'Heera'];
            const isFemaleVoice = (v) => femaleNames.some(name => v.name.includes(name));

            const voicePriority = [
                v => v.name.includes('Yuna') && v.name.includes('Premium'),
                v => v.name.includes('Yuna'),
                v => v.name.includes('Sora'),
                v => isFemaleVoice(v) && (v.name.includes('Online') || v.name.includes('Neural')),
                v => v.name.includes('SunHi'),
                v => v.name.includes('Heami'),
                v => v.name.includes('Google') && !v.localService,
                v => v.name.includes('Google'),
                v => isFemaleVoice(v),
                v => v.name.includes('Online') || v.name.includes('Neural'),
                v => v.name.includes('Microsoft') && !v.localService,
                v => !v.localService,
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
                console.log('[VoiceService] 선택된 Web Speech 음성:', {
                    name: this.koreanVoice.name,
                    lang: this.koreanVoice.lang,
                    local: this.koreanVoice.localService
                });
            }
        };

        if (this.synthesis.getVoices().length > 0) {
            loadVoices();
        } else {
            this.synthesis.onvoiceschanged = loadVoices;
        }

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

        this.synthesis.cancel();
        this.onStateChange?.({ type: 'stopped', isListening: false });
    }

    /**
     * TTS로 텍스트 읽기 (적응형: Supertonic 2 우선, Web Speech API 폴백)
     */
    async speak(text, options = {}) {
        // Supertonic 2가 준비되었으면 사용
        if (this.supertonicReady && synthesizer) {
            await this.speakWithSupertonic(text, options);
        } else {
            // Web Speech API 폴백
            this.speakWithWebSpeech(text, options);
        }
    }

    /**
     * Supertonic 2로 TTS (고품질)
     */
    async speakWithSupertonic(text, options = {}) {
        try {
            console.log('[VoiceService] Supertonic 2 TTS 시작:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
            this.onStateChange?.({ type: 'speaking', text, engine: 'supertonic' });

            // 한국어 음성 합성
            const output = await synthesizer(text, {
                language: 'ko',
                speaker_id: 'F1' // 여성 음성
            });

            // 오디오 재생
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(output.audio.buffer);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = options.rate ?? this.ttsConfig.rate;

            const gainNode = audioContext.createGain();
            gainNode.gain.value = options.volume ?? this.ttsConfig.volume;

            source.connect(gainNode);
            gainNode.connect(audioContext.destination);

            source.onended = () => {
                console.log('[VoiceService] Supertonic 2 TTS 완료');
                this.onStateChange?.({ type: 'speakEnd' });
                audioContext.close();
            };

            source.start();

        } catch (error) {
            console.error('[VoiceService] Supertonic 2 TTS 에러, Web Speech로 폴백:', error);
            // 에러 시 Web Speech API로 폴백
            this.speakWithWebSpeech(text, options);
        }
    }

    /**
     * Web Speech API로 TTS (폴백)
     */
    speakWithWebSpeech(text, options = {}) {
        if (!this.synthesis) {
            console.error('[VoiceService] TTS not supported');
            return;
        }

        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = options.rate ?? this.ttsConfig.rate;
        utterance.pitch = options.pitch ?? this.ttsConfig.pitch;
        utterance.volume = options.volume ?? this.ttsConfig.volume;

        if (this.koreanVoice) {
            utterance.voice = this.koreanVoice;
        }

        utterance.onstart = () => {
            console.log('[VoiceService] Web Speech TTS 시작:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
            this.onStateChange?.({ type: 'speaking', text, engine: 'web-speech' });
        };

        utterance.onend = () => {
            console.log('[VoiceService] Web Speech TTS 완료');
            this.onStateChange?.({ type: 'speakEnd' });
        };

        utterance.onerror = (event) => {
            console.error('[VoiceService] Web Speech TTS 에러:', event.error);
            this.onStateChange?.({ type: 'speakEnd' });
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
            ttsEngine: this.ttsEngine,
            supertonicReady: this.supertonicReady,
            supertonicLoading: this.supertonicLoading,
            deviceInfo: this.deviceInfo
        };
    }

    /**
     * 사용 가능한 한국어 음성 목록 반환
     */
    getAvailableVoices() {
        return this.availableVoices;
    }

    /**
     * 특정 음성으로 변경 (Web Speech API용)
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

    /**
     * Supertonic 2 수동 로드 (저사양 기기에서도 강제 로드)
     */
    async forceLoadSupertonic() {
        if (this.supertonicReady) {
            console.log('[VoiceService] Supertonic 2 이미 로드됨');
            return true;
        }
        await this.loadSupertonicInBackground();
        return this.supertonicReady;
    }
}

// 싱글톤 인스턴스
export const voiceService = new VoiceService();

export default VoiceService;
