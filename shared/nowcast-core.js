function toIsoFromUnixSeconds(seconds) {
  return new Date(seconds * 1000).toISOString();
}

export function classifyRateToIntensity(precipRateMmPerHour) {
  const value = Number(precipRateMmPerHour);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value < 1) {
    return 1;
  }
  if (value < 5) {
    return 2;
  }
  return 3;
}

export function rgbaToIntensity(r, g, b, a) {
  // Transparent pixels represent no radar return.
  if (a < 50) {
    return 0;
  }

  const max = Math.max(r, g, b);

  // Yellow/orange cores usually indicate moderate cells in this color scheme.
  if (r > 200 && g > 100 && b < 120) {
    return 2;
  }

  // Red, pink, and white tops indicate heavy precipitation.
  if ((r > 200 && g < 110 && b < 110) || (r > 220 && b > 160) || max > 245) {
    return 3;
  }

  // Blue/cyan echoes are light precipitation.
  if (b >= r && b >= g) {
    return 1;
  }

  return 1;
}

export function normalizeRainViewerRadarPoints(points) {
  return points
    .filter((point) => Number.isFinite(point?.timestampSec))
    .sort((a, b) => a.timestampSec - b.timestampSec)
    .map((point) => ({
      timestamp: toIsoFromUnixSeconds(point.timestampSec),
      precipitationIntensity: point.precipitationIntensity,
      precipRate: point.precipRate ?? null,
      source: "rainviewer"
    }));
}

export function normalizeRainbowNowcast(raw) {
  const forecast = Array.isArray(raw?.forecast) ? raw.forecast : [];

  return forecast.slice(0, 60).map((item) => {
    const rate = Number(item?.precipRate);
    const timestampSec = Number(item?.timestampBegin);

    return {
      timestamp: Number.isFinite(timestampSec) ? toIsoFromUnixSeconds(timestampSec) : new Date().toISOString(),
      precipitationIntensity: classifyRateToIntensity(rate),
      precipRate: Number.isFinite(rate) ? rate : null,
      source: "rainbow"
    };
  });
}
