const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const SERVICE_KEY = import.meta.env.VITE_KMA_SERVICE_KEY;
const DEFAULT_GRID = { nx: 55, ny: 127 };

const DFS = {
    RE: 6371.00877,
    GRID: 5.0,
    SLAT1: 30.0,
    SLAT2: 60.0,
    OLON: 126.0,
    OLAT: 38.0,
    XO: 43,
    YO: 136
};

const pad2 = (value) => String(value).padStart(2, '0');

const getDefaultBaseDateTime = () => {
    const now = new Date();
    const baseDate = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;

    return { baseDate, baseTime: '0500' };
};

const getNowcastBaseDateTime = () => {
    const now = new Date();
    const base = new Date(now);
    if (now.getMinutes() < 40) {
        base.setHours(base.getHours() - 1);
    }

    const baseDate = `${base.getFullYear()}${pad2(base.getMonth() + 1)}${pad2(base.getDate())}`;
    const baseTime = `${pad2(base.getHours())}40`;

    return { baseDate, baseTime };
};

export const latLonToGrid = (latitude, longitude) => {
    const DEGRAD = Math.PI / 180.0;
    const re = DFS.RE / DFS.GRID;
    const slat1 = DFS.SLAT1 * DEGRAD;
    const slat2 = DFS.SLAT2 * DEGRAD;
    const olon = DFS.OLON * DEGRAD;
    const olat = DFS.OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + latitude * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);
    let theta = longitude * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    const x = Math.floor(ra * Math.sin(theta) + DFS.XO + 0.5);
    const y = Math.floor(ro - ra * Math.cos(theta) + DFS.YO + 0.5);

    return { nx: x, ny: y };
};

export async function fetchVilageForecast({
    baseDate,
    baseTime,
    nx,
    ny,
    pageNo = '1',
    numOfRows = '10',
    dataType = 'JSON'
} = {}) {
    if (!SERVICE_KEY) {
        throw new Error('VITE_KMA_SERVICE_KEY is not set');
    }

    const defaults = getDefaultBaseDateTime();
    const params = new URLSearchParams({
        serviceKey: SERVICE_KEY,
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        dataType,
        base_date: baseDate ?? defaults.baseDate,
        base_time: baseTime ?? defaults.baseTime,
        nx: String(nx ?? DEFAULT_GRID.nx),
        ny: String(ny ?? DEFAULT_GRID.ny)
    });

    const url = `${BASE_URL}/getVilageFcst?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`KMA error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export async function fetchUltraSrtNcst({
    baseDate,
    baseTime,
    nx,
    ny,
    pageNo = '1',
    numOfRows = '50',
    dataType = 'JSON'
} = {}) {
    if (!SERVICE_KEY) {
        throw new Error('VITE_KMA_SERVICE_KEY is not set');
    }

    const defaults = getNowcastBaseDateTime();
    const params = new URLSearchParams({
        serviceKey: SERVICE_KEY,
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        dataType,
        base_date: baseDate ?? defaults.baseDate,
        base_time: baseTime ?? defaults.baseTime,
        nx: String(nx ?? DEFAULT_GRID.nx),
        ny: String(ny ?? DEFAULT_GRID.ny)
    });

    const url = `${BASE_URL}/getUltraSrtNcst?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`KMA error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
