const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL;

/**
 * 끝말잇기 서비스
 * - 졸음 운전 방지를 위한 간단한 게임
 * - Claude LLM (via Backend API) 활용
 */
export const wordChainService = {
    // 게임 시작 멘트
    startGame: () => {
        return "좋아요! 끝말잇기를 시작할게요. 제가 먼저 할게요. '나무'! '무'로 시작하는 단어를 말씀해주세요.";
    },

    // 사용자의 단어를 받아 다음 단어 생성 (LLM 호출)
    getNextWord: async (userWord) => {
        // 1. 입력 유효성 검사
        if (!userWord || userWord.trim().length === 0) {
            return "잘 못 들었어요. 다시 말씀해 주시겠어요?";
        }

        // 2. API 없으면 Fallback
        if (!CHAT_API_URL) {
            console.warn("[WordChain] API URL이 설정되지 않았습니다.");
            return getFallbackResponse(userWord);
        }

        try {
            // 3. LLM API 호출
            // System Prompt: 운전자 졸음 방지용 끝말잇기 봇 (엄격한 포맷)
            const prompt = `
[끝말잇기 게임]
사용자가 방금 '${userWord}'라고 말했습니다.

규칙:
1. 사용자의 단어가 이전 단어와 이어지는지 확인하세요.
2. 이어지는 단어를 하나 제시하세요.
3. **대답 형식**: 제시할 단어 뒤에 "입니다. 이어 말해주세요."를 붙여서 말하세요.
4. 사설이나 다른 말은 붙이지 마세요.

답변 예시:
사용자: "기차"
AI: "차표입니다. 이어 말해주세요."

사용자: "사과"
AI: "과일입니다. 이어 말해주세요."
`;

            const response = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 필요시 Auth 헤더 추가
                },
                body: JSON.stringify({
                    message: prompt,
                    // 백엔드가 Claude를 쓴다고 가정하고, 별도 파라미터가 필요하다면 여기에 추가
                    model: 'claude-3-haiku-20240307' // 혹시나 해서 추가
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            // 응답 필드 적응형 처리 (message, reply, content, answer 등)
            const reply = data.reply || data.message || data.content || data.answer || data.text;

            if (reply) {
                return reply;
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("[WordChain] API 호출 실패:", error);
            // API 호출 실패 시 로컬 Fallback 로직 사용
            return getFallbackResponse(userWord);
        }
    }
};

/**
 * 로컬 룰 베이스 응답 (API 실패 시 사용)
 */
const getFallbackResponse = (userWord) => {
    const lastChar = userWord.charAt(userWord.length - 1);

    // 간단한 단어장
    const wordDb = {
        '가': ['가방', '가위', '가족', '가게'],
        '나': ['나비', '나무', '나팔', '나라'],
        '다': ['다람쥐', '다리', '다미'],
        '라': ['라디오', '라면', '라일락'],
        '마': ['마음', '마차', '마늘'],
        '바': ['바다', '바나나', '바구니'],
        '사': ['사랑', '사자', '사다리'],
        '아': ['아기', '아빠', '아침'],
        '자': ['자두', '자동차', '자전거'],
        '차': ['차표', '차고', '차도'],
        '카': ['카메라', '카드', '카페'],
        '타': ['타조', '타이어', '타자'],
        '파': ['파도', '파리', '파란색'],
        '하': ['하늘', '하루', '하마'],
        '무': ['무지개', '무우', '무용'],
        '표': ['표범', '표지판'],
        '기': ['기차', '기린', '기도'],
        '장': ['장미', '장갑', '장독대'],
        '강': ['강아지', '강물', '강력분'],
        '물': ['물고기', '물개', '물감'],
        '리': ['리본', '리무진'],
        '지': ['지구', '지갑', '지도'],
        '구': ['구름', '구두', '구슬'],
        '름': ['음... 름으로 시작하는 단어는 어렵네요. 제가 졌어요! 다시 시작할까요? 시작 단어는 사과!']
    };

    // 받침 처리가 복잡하므로 단순 매칭 시도
    const candidates = wordDb[lastChar];

    if (candidates && candidates.length > 0) {
        const nextWord = candidates[Math.floor(Math.random() * candidates.length)];
        const nextLastChar = nextWord.charAt(nextWord.length - 1);
        return `${nextWord}입니다. 이어 말해주세요.`;
    } else {
        return `음... '${lastChar}'(으)로 시작하는 단어가 생각나지 않네요. 당신의 승리입니다! 운전 조심하시고 다시 시작해볼까요? 이번엔 '바나나'부터 시작해요!`;
    }
};
