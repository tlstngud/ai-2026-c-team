import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// API 키가 없으면 서비스를 초기화하지 않음
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const assessDrivingLog = async (data) => {
    if (!genAI) {
        throw new Error("API Key is missing. Please set VITE_GEMINI_API_KEY in .env file.");
    }

    try {
        // 제미나이 2.5 Flash 모델 사용
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });


        const prompt = `

        [입력 데이터]
        - 주행 시간(초): ${data.duration}
        - 주행 거리(km): ${data.distance}
        - 졸음운전(회): ${data.drowsyCount ?? 0}
        - 휴대폰 조작(회): ${data.phoneCount ?? 0}
        - 급가속(회): ${data.gpsEvents?.hardAccel ?? 0}
        - 급감속(회): ${data.gpsEvents?.hardBrake ?? 0}
        - 과속(회): ${data.gpsEvents?.overspeed ?? 0}
        - 종합 점수(점): ${data.score}

        [작성 규칙(중요)]
        - 출력은 아래 템플릿을 그대로 사용.
        - 각 섹션은 최대 3줄.
        - 각 줄은 45자 이내.
        - 숫자는 입력값을 그대로 사용.
        - ★ 위험 이벤트가 0회이면 "개선점 없음"으로 판단.
        - ★ 억지로 문제를 만들지 말 것.
        - 조언은 있을 때만 작성.
        - 말투는 부드러운 코치형, 사용자에게 말하듯 작성.
        - 칭찬은 구체적으로, 형식적인 표현 금지.

        [출력 템플릿]
        1) 안전 운전 습관
        - (집중도 평가)
        - (주행 스타일 평가)
        - (요약: 전반적 인상)

        2) 개선을 위한 조언
        - 개선점: (없으면 "뚜렷한 개선점은 없습니다.")
        - 트리거: (없으면 "해당 없음")
        - 실천: (없으면 "현재 습관을 유지하세요.")

        3) 잘한 점
        - (구체적인 칭찬)
        - (유지하면 좋은 이유)
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        // 사용자에게 구체적인 에러 메시지 전달 (디버깅용)
        throw new Error(`주행 기록 분석 실패: ${error.message || "알 수 없는 오류"}`);
    }
};
