import kmaGrid from '../data/kmaGrid.json';

export const getRegionByLatLon = (latitude, longitude) => {
    if (!Array.isArray(kmaGrid) || kmaGrid.length === 0) {
        return null;
    }

    let best = null;
    let bestScore = Infinity;

    for (const entry of kmaGrid) {
        const dx = entry.lat - latitude;
        const dy = entry.lon - longitude;
        const score = (dx * dx) + (dy * dy);

        if (score < bestScore) {
            bestScore = score;
            best = entry;
        }
    }

    return best;
};

export const formatRegion = (region) => {
    if (!region) {
        return '';
    }

    return [region.step1, region.step2, region.step3]
        .filter((value) => value && value.trim().length > 0)
        .join(' ');
};
