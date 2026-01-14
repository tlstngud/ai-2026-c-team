const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.db');

// 데이터베이스 연결
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('SQLite 데이터베이스에 연결되었습니다.');
    }
});

// 데이터베이스 초기화 (테이블 생성)
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users 테이블
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    score INTEGER DEFAULT 80,
                    discount_rate INTEGER DEFAULT 0,
                    region_name TEXT,
                    region_address TEXT,
                    region_campaign TEXT,
                    region_target INTEGER,
                    region_reward TEXT,
                    violations_drowsy INTEGER DEFAULT 0,
                    violations_phone INTEGER DEFAULT 0,
                    violations_assault INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Driving Logs 테이블
            db.run(`
                CREATE TABLE IF NOT EXISTS driving_logs (
                    log_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    date DATETIME NOT NULL,
                    score INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    distance REAL,
                    events INTEGER DEFAULT 0,
                    hard_accel INTEGER DEFAULT 0,
                    hard_brake INTEGER DEFAULT 0,
                    overspeed INTEGER DEFAULT 0,
                    max_speed INTEGER,
                    driver_behavior_score INTEGER,
                    speed_limit_score INTEGER,
                    accel_decel_score INTEGER,
                    route TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                )
            `);

            // Coupons 테이블
            db.run(`
                CREATE TABLE IF NOT EXISTS coupons (
                    coupon_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    amount TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    status TEXT DEFAULT 'AVAILABLE',
                    expiry DATETIME NOT NULL,
                    theme TEXT,
                    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    used_at DATETIME,
                    challenge_id TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                )
            `);

            // Challenges 테이블
            db.run(`
                CREATE TABLE IF NOT EXISTS challenges (
                    challenge_id TEXT PRIMARY KEY,
                    region TEXT NOT NULL,
                    name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    target_score INTEGER NOT NULL,
                    reward TEXT NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    description TEXT,
                    rules TEXT,
                    conditions TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Challenge Participants 테이블
            db.run(`
                CREATE TABLE IF NOT EXISTS challenge_participants (
                    participant_id TEXT PRIMARY KEY,
                    challenge_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    current_score INTEGER,
                    distance REAL DEFAULT 0,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id),
                    FOREIGN KEY (user_id) REFERENCES users(user_id),
                    UNIQUE(challenge_id, user_id)
                )
            `);

            // 기본 챌린지 데이터 삽입
            db.run(`
                INSERT OR IGNORE INTO challenges (challenge_id, region, name, title, target_score, reward, start_date, end_date, description, rules, conditions)
                VALUES 
                ('challenge_chuncheon', '춘천시', '스마일 춘천 안전운전', '춘천시 안전운전 챌린지', 90, '춘천사랑상품권 3만원 + 보험할인', '2026-01-15 00:00:00', '2026-01-29 23:59:59', '춘천시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.', 
                 '["지정된 기간 동안 100km 이상 주행", "안전운전 점수 90점 이상 유지", "급가속/급감속 최소화"]',
                 '["춘천시 거주자 또는 주 활동 운전자", "최근 1년 내 중과실 사고 이력 없음", "마케팅 활용 동의 필수"]'),
                ('challenge_seoul', '서울특별시', '서울 마이-티 드라이버', '서울특별시 안전운전 챌린지', 92, '서울시 공영주차장 50% 할인권', '2026-01-15 00:00:00', '2026-01-29 23:59:59', '서울특별시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.',
                 '["지정된 기간 동안 100km 이상 주행", "안전운전 점수 92점 이상 유지", "급가속/급감속 최소화"]',
                 '["서울특별시 거주자 또는 주 활동 운전자", "최근 1년 내 중과실 사고 이력 없음", "마케팅 활용 동의 필수"]')
            `, (err) => {
                if (err) {
                    console.error('기본 데이터 삽입 오류:', err);
                    reject(err);
                } else {
                    console.log('데이터베이스 초기화 완료');
                    resolve();
                }
            });
        });
    });
};

// Promise 기반 쿼리 헬퍼 함수들
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

module.exports = {
    db,
    initDatabase,
    dbRun,
    dbGet,
    dbAll
};
