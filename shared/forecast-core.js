export const APP_VERSION = "1.2.3";
export const CACHE_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_LOCATION_QUERY = "15108";
export const DEFAULT_LOCATION = {
  displayName: "Coraopolis, PA 15108",
  lat: 40.5009,
  lon: -80.2181,
  countryCode: "US",
  postalCode: "15108",
  timezone: "America/New_York"
};

export const PROVIDER_STATUS = {
  ACTIVE: "active",
  SETUP_REQUIRED: "setup_required",
  UNSUPPORTED_FOR_LOCATION: "unsupported_for_location",
  PARTIAL_COVERAGE: "partial_coverage"
};

export const PROVIDERS = [
  {
    id: "nws",
    label: "NOAA / NWS",
    family: "NWS",
    requiresKey: false,
    color: "#4cc9f0",
    tempStyle: "solid"
  },
  {
    id: "openmeteo_gfs",
    label: "Open-Meteo GFS",
    family: "Open-Meteo",
    requiresKey: false,
    color: "#f72585",
    tempStyle: "solid",
    model: "gfs"
  },
  {
    id: "openmeteo_ecmwf",
    label: "Open-Meteo ECMWF",
    family: "Open-Meteo",
    requiresKey: false,
    color: "#4895ef",
    tempStyle: "dashed",
    model: "ecmwf_ifs04"
  },
  {
    id: "weatherapi",
    label: "WeatherAPI.com",
    family: "WeatherAPI.com",
    requiresKey: true,
    color: "#ff9e00",
    tempStyle: "solid"
  },
  {
    id: "openweather",
    label: "OpenWeatherMap",
    family: "OpenWeatherMap",
    requiresKey: true,
    color: "#90be6d",
    tempStyle: "solid"
  },
  {
    id: "forecastpro",
    label: "ForecastPro",
    family: "ForecastPro",
    requiresKey: true,
    color: "#e76f51",
    tempStyle: "dotted"
  },
  {
    id: "wxdata",
    label: "WxData API",
    family: "WxData",
    requiresKey: true,
    color: "#9b5de5",
    tempStyle: "dashed"
  },
  {
    id: "weatherdb",
    label: "weatherDB",
    family: "weatherDB",
    requiresKey: false,
    color: "#43aa8b",
    tempStyle: "dotted"
  },
  {
    id: "pirateweather",
    label: "Pirate Weather",
    family: "Pirate Weather",
    requiresKey: true,
    color: "#f4a261",
    tempStyle: "dashed"
  },
  {
    id: "tomorrowio",
    label: "Tomorrow.io",
    family: "Tomorrow.io",
    requiresKey: true,
    color: "#06d6a0",
    tempStyle: "solid"
  }
];

export const THEMES = [
  {
    id: "aurora-night",
    label: "Aurora Night",
    mode: "dark",
    colors: {
      "--bg": "#07111f",
      "--panel": "#0f1d31",
      "--panel-alt": "#152540",
      "--text": "#f3f6fb",
      "--muted": "#93a6c6",
      "--accent": "#70e1f5",
      "--accent-2": "#ffd166",
      "--line": "rgba(255,255,255,0.08)",
      "--shadow": "0 20px 50px rgba(0,0,0,0.3)"
    }
  },
  {
    id: "ember-dark",
    label: "Ember Dark",
    mode: "dark",
    colors: {
      "--bg": "#150d0f",
      "--panel": "#231517",
      "--panel-alt": "#301b1d",
      "--text": "#fff5ef",
      "--muted": "#d4b8ab",
      "--accent": "#ff7b54",
      "--accent-2": "#ffd56b",
      "--line": "rgba(255,255,255,0.08)",
      "--shadow": "0 20px 50px rgba(0,0,0,0.34)"
    }
  },
  {
    id: "fjord-dark",
    label: "Fjord Dark",
    mode: "dark",
    colors: {
      "--bg": "#06151a",
      "--panel": "#0d252d",
      "--panel-alt": "#15343f",
      "--text": "#ecfbff",
      "--muted": "#9cc6d1",
      "--accent": "#4dd0e1",
      "--accent-2": "#ffcc80",
      "--line": "rgba(255,255,255,0.08)",
      "--shadow": "0 20px 50px rgba(0,0,0,0.32)"
    }
  },
  {
    id: "graphite-dark",
    label: "Graphite Dark",
    mode: "dark",
    colors: {
      "--bg": "#111315",
      "--panel": "#191d21",
      "--panel-alt": "#23292f",
      "--text": "#f7f8fa",
      "--muted": "#a9b3bf",
      "--accent": "#8ecae6",
      "--accent-2": "#ffb703",
      "--line": "rgba(255,255,255,0.08)",
      "--shadow": "0 20px 50px rgba(0,0,0,0.34)"
    }
  },
  {
    id: "violet-grid",
    label: "Violet Grid",
    mode: "dark",
    colors: {
      "--bg": "#120c22",
      "--panel": "#1c1430",
      "--panel-alt": "#251b3e",
      "--text": "#f8f4ff",
      "--muted": "#b7a9d6",
      "--accent": "#c77dff",
      "--accent-2": "#80ffdb",
      "--line": "rgba(255,255,255,0.08)",
      "--shadow": "0 20px 50px rgba(0,0,0,0.34)"
    }
  },
  {
    id: "paper-sky",
    label: "Paper Sky",
    mode: "light",
    colors: {
      "--bg": "#f4f8ff",
      "--panel": "#ffffff",
      "--panel-alt": "#edf4ff",
      "--text": "#18314f",
      "--muted": "#5f7693",
      "--accent": "#1d4ed8",
      "--accent-2": "#ef4444",
      "--line": "rgba(24,49,79,0.1)",
      "--shadow": "0 20px 50px rgba(29,78,216,0.12)"
    }
  },
  {
    id: "citrus-light",
    label: "Citrus Light",
    mode: "light",
    colors: {
      "--bg": "#fffaf0",
      "--panel": "#fffef8",
      "--panel-alt": "#fff3d6",
      "--text": "#3a2e1e",
      "--muted": "#7c6c54",
      "--accent": "#f77f00",
      "--accent-2": "#2a9d8f",
      "--line": "rgba(58,46,30,0.1)",
      "--shadow": "0 20px 50px rgba(247,127,0,0.12)"
    }
  },
  {
    id: "mint-light",
    label: "Mint Light",
    mode: "light",
    colors: {
      "--bg": "#f3fffb",
      "--panel": "#ffffff",
      "--panel-alt": "#e6fff4",
      "--text": "#153b35",
      "--muted": "#5c837d",
      "--accent": "#00a896",
      "--accent-2": "#f07167",
      "--line": "rgba(21,59,53,0.1)",
      "--shadow": "0 20px 50px rgba(0,168,150,0.12)"
    }
  },
  {
    id: "rose-light",
    label: "Rose Light",
    mode: "light",
    colors: {
      "--bg": "#fff7fb",
      "--panel": "#ffffff",
      "--panel-alt": "#ffe9f3",
      "--text": "#4e2341",
      "--muted": "#8a5f79",
      "--accent": "#d63384",
      "--accent-2": "#577590",
      "--line": "rgba(78,35,65,0.1)",
      "--shadow": "0 20px 50px rgba(214,51,132,0.12)"
    }
  },
  {
    id: "sand-light",
    label: "Sand Light",
    mode: "light",
    colors: {
      "--bg": "#f9f5ef",
      "--panel": "#ffffff",
      "--panel-alt": "#f1e9dc",
      "--text": "#3d3527",
      "--muted": "#756854",
      "--accent": "#b08968",
      "--accent-2": "#457b9d",
      "--line": "rgba(61,53,39,0.1)",
      "--shadow": "0 20px 50px rgba(176,137,104,0.12)"
    }
  }
];

function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function normalizedChancePct(value, fallbackBoolean = null) {
  if (value === null || value === undefined || value === "") {
    if (fallbackBoolean === 1 || fallbackBoolean === true) {
      return 100;
    }
    if (fallbackBoolean === 0 || fallbackBoolean === false) {
      return 0;
    }
    return null;
  }
  return round(value, 0);
}

export function cToF(valueC) {
  return valueC === null || valueC === undefined ? null : round((valueC * 9) / 5 + 32, 1);
}

export function mmFromInches(valueInches) {
  return valueInches === null || valueInches === undefined ? null : round(valueInches * 25.4, 2);
}

export function mmFromCm(valueCm) {
  return valueCm === null || valueCm === undefined ? null : round(valueCm * 10, 2);
}

export function mmFromMeters(valueMeters) {
  return valueMeters === null || valueMeters === undefined ? null : round(valueMeters * 1000, 2);
}

export function hourIso(dateLike) {
  const date = new Date(dateLike);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

export function isoFromSourceTime(value, utcOffsetSeconds = 0) {
  if (typeof value === "number") {
    return hourIso(value);
  }

  const normalized = String(value).replace(" ", "T");
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized);
  if (hasTimezone) {
    return hourIso(normalized);
  }

  const pseudoUtcMs = Date.parse(`${normalized}:00`.replace(/:00:00$/, ":00") + "Z");
  return hourIso(pseudoUtcMs - utcOffsetSeconds * 1000);
}

export function createUnifiedTimeline(now = new Date()) {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(start.getUTCHours() - 4);

  const hours = [];
  for (let offset = 0; offset <= 76; offset += 1) {
    const current = new Date(start);
    current.setUTCHours(start.getUTCHours() + offset);
    hours.push(current.toISOString());
  }
  return hours;
}

export function alignHoursToTimeline(hourMap, timeline, meta = {}) {
  return timeline.map((isoTime) => {
    const match = hourMap.get(isoTime);
    return {
      isoTime,
      tempF: match?.tempF ?? null,
      precipMm: match?.precipMm ?? null,
      precipChancePct: match?.precipChancePct ?? null,
      sourceTempUnit: match?.sourceTempUnit ?? meta.sourceTempUnit ?? "F",
      sourcePrecipUnit: match?.sourcePrecipUnit ?? meta.sourcePrecipUnit ?? "mm",
      isForecast: match?.isForecast ?? isoTime >= hourIso(new Date()),
      isPastFill: match?.isPastFill ?? !match
    };
  });
}

export function emptyForecast(providerId, location, timeline, status, note = "") {
  return {
    providerId,
    location,
    fetchedAt: new Date().toISOString(),
    status,
    note,
    hours: alignHoursToTimeline(new Map(), timeline)
  };
}

export function normalizeNwsHourly(raw, timeline, location) {
  const periods = raw?.hourly?.properties?.periods ?? [];
  const entries = new Map();
  const qpfEntries = buildNwsQuantitativePrecipMap(raw?.grid?.properties?.quantitativePrecipitation?.values ?? []);
  const popEntries = buildNwsGridValueMap(raw?.grid?.properties?.probabilityOfPrecipitation?.values ?? []);
  const debugSamples = [];

  for (const period of periods) {
    const isoTime = hourIso(period.startTime);
    const hourlyChancePct = typeof period?.probabilityOfPrecipitation?.value === "number"
      ? normalizedChancePct(period.probabilityOfPrecipitation.value)
      : null;
    const precipChancePct = hourlyChancePct ?? popEntries.get(isoTime)?.value ?? null;
    const gridMatch = qpfEntries.get(isoTime);
    if (debugSamples.length < 6) {
      debugSamples.push({
        isoTime,
        hourlyChancePct,
        gridChancePct: popEntries.get(isoTime)?.value ?? null,
        sourceChancePct: precipChancePct,
        sourceAccumMm: gridMatch?.precipMm ?? null
      });
    }
    entries.set(isoTime, {
      tempF: round(period.temperature, 1),
      precipMm: gridMatch?.precipMm ?? null,
      precipChancePct,
      sourceTempUnit: period.temperatureUnit ?? "F",
      sourcePrecipUnit: "mm",
      isForecast: true,
      isPastFill: false
    });
  }

  return {
    providerId: "nws",
    location,
    fetchedAt: new Date().toISOString(),
    status: PROVIDER_STATUS.ACTIVE,
    note: periods.length
      ? (qpfEntries.size
        ? `NOAA debug sample: ${debugSamples.map((sample) => `${sample.isoTime} hourlyChance=${sample.hourlyChancePct ?? "n/a"}% gridChance=${sample.gridChancePct ?? "n/a"}% finalChance=${sample.sourceChancePct ?? "n/a"}% accum=${sample.sourceAccumMm ?? "n/a"}mm`).join(" | ")}`
        : "NOAA precipitation accumulation grid was unavailable; chance values may still be shown.")
      : "No hourly forecast periods returned.",
    hours: alignHoursToTimeline(entries, timeline, { sourceTempUnit: "F", sourcePrecipUnit: "mm" })
  };
}

export function normalizeOpenMeteo(raw, timeline, location, providerId) {
  const hourly = raw?.hourly ?? {};
  const times = hourly.time ?? [];
  const temps = hourly.temperature_2m ?? [];
  const precipitation = hourly.precipitation ?? [];
  const precipitationProbability = hourly.precipitation_probability ?? [];
  const entries = new Map();
  const utcOffsetSeconds = raw?.utc_offset_seconds ?? 0;
  const tempUnit = raw?.hourly_units?.temperature_2m ?? "F";
  const precipUnit = raw?.hourly_units?.precipitation ?? "mm";

  times.forEach((time, index) => {
    entries.set(isoFromSourceTime(time, utcOffsetSeconds), {
      tempF: String(tempUnit).toUpperCase().includes("C") ? cToF(temps[index]) : round(temps[index], 1),
      precipMm: round(precipitation[index], 2),
      precipChancePct: normalizedChancePct(precipitationProbability[index]),
      sourceTempUnit: tempUnit,
      sourcePrecipUnit: precipUnit,
      isForecast: true,
      isPastFill: false
    });
  });

  return {
    providerId,
    location,
    fetchedAt: new Date().toISOString(),
    status: PROVIDER_STATUS.ACTIVE,
    note: "",
    hours: alignHoursToTimeline(entries, timeline, { sourceTempUnit: tempUnit, sourcePrecipUnit: precipUnit }),
    astronomy: raw?.daily?.time?.map((time, index) => ({
      date: time,
      sunrise: raw?.daily?.sunrise?.[index] ?? null,
      sunset: raw?.daily?.sunset?.[index] ?? null
    })) ?? []
  };
}

export function normalizeWeatherApi(raw, timeline, location) {
  const forecastDays = raw?.forecast?.forecastday ?? [];
  const entries = new Map();
  const localtime = raw?.location?.localtime;
  const localtimeEpoch = raw?.location?.localtime_epoch;
  const utcOffsetSeconds = localtime && localtimeEpoch
    ? Math.round((Date.parse(localtime.replace(" ", "T") + ":00Z") - localtimeEpoch * 1000) / 1000)
    : 0;

  for (const day of forecastDays) {
    for (const hour of day.hour ?? []) {
      entries.set(isoFromSourceTime(hour.time, utcOffsetSeconds), {
        tempF: round(hour.temp_f, 1),
        precipMm: round(hour.precip_mm, 2),
        precipChancePct: normalizedChancePct(hour.chance_of_rain, hour.will_it_rain),
        sourceTempUnit: "F",
        sourcePrecipUnit: "mm",
        isForecast: true,
        isPastFill: false
      });
    }
  }

  return {
    providerId: "weatherapi",
    location,
    fetchedAt: new Date().toISOString(),
    status: forecastDays.length ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.PARTIAL_COVERAGE,
    note: forecastDays.length ? "" : "WeatherAPI returned no hourly forecast data.",
    hours: alignHoursToTimeline(entries, timeline)
  };
}

export function normalizeOpenWeather(raw, timeline, location) {
  const entries = new Map();
  const hourly = raw?.hourly ?? [];
  for (const hour of hourly) {
    entries.set(hourIso(hour.dt * 1000), {
      tempF: cToF(hour.temp),
      precipMm: round(hour.rain?.["1h"] ?? 0, 2),
      precipChancePct: typeof hour.pop === "number" ? normalizedChancePct(hour.pop * 100) : null,
      sourceTempUnit: "C",
      sourcePrecipUnit: "mm",
      isForecast: true,
      isPastFill: false
    });
  }

  return {
    providerId: "openweather",
    location,
    fetchedAt: new Date().toISOString(),
    status: hourly.length ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.SETUP_REQUIRED,
    note: hourly.length ? "" : "OpenWeatherMap hourly data unavailable for this key or plan.",
    hours: alignHoursToTimeline(entries, timeline, { sourceTempUnit: "C", sourcePrecipUnit: "mm" })
  };
}

export function normalizePirateWeather(raw, timeline, location) {
  const hourly = raw?.hourly?.data ?? [];
  const entries = new Map();

  for (const hour of hourly) {
    const isoTime = hourIso(hour.time * 1000);
    entries.set(isoTime, {
      tempF: round(hour.temperature, 1),
      precipMm: mmFromInches(hour.precipIntensity ?? 0),
      precipChancePct: normalizedChancePct((hour.precipProbability ?? null) !== null ? (hour.precipProbability * 100) : null),
      sourceTempUnit: "F",
      sourcePrecipUnit: "mm",
      isForecast: true,
      isPastFill: false
    });
  }

  return {
    providerId: "pirateweather",
    location,
    fetchedAt: new Date().toISOString(),
    status: hourly.length ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.SETUP_REQUIRED,
    note: hourly.length ? "" : "Pirate Weather returned no hourly data.",
    hours: alignHoursToTimeline(entries, timeline, { sourceTempUnit: "F", sourcePrecipUnit: "mm" })
  };
}

export function normalizeTomorrowIo(raw, timeline, location) {
  const hourly = raw?.timelines?.hourly ?? [];
  const entries = new Map();

  for (const item of hourly) {
    const isoTime = hourIso(item.time);
    const v = item.values ?? {};
    entries.set(isoTime, {
      tempF: round(v.temperature, 1),
      precipMm: mmFromInches(v.precipitationIntensity ?? 0),
      precipChancePct: normalizedChancePct(v.precipitationProbability ?? null),
      sourceTempUnit: "F",
      sourcePrecipUnit: "mm",
      isForecast: true,
      isPastFill: false
    });
  }

  return {
    providerId: "tomorrowio",
    location,
    fetchedAt: new Date().toISOString(),
    status: hourly.length ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.SETUP_REQUIRED,
    note: hourly.length ? "" : "Tomorrow.io returned no hourly data.",
    hours: alignHoursToTimeline(entries, timeline, { sourceTempUnit: "F", sourcePrecipUnit: "mm" })
  };
}

export function buildHourlyMap(hours) {
  return new Map(hours.map((hour) => [hour.isoTime, hour]));
}

export function buildMidnightMarks(timeline, timezone = "UTC") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23"
  });
  return timeline
    .filter((isoTime) => {
      return formatter.format(new Date(isoTime)) === "00";
    })
    .map((isoTime) => ({ xAxis: isoTime, value: isoTime }));
}

function formatDateKey(isoTime, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(new Date(isoTime));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function buildDayNightBands(timeline, timezone = "UTC", astronomy = []) {
  if (!astronomy.length) {
    return [];
  }
  const sunriseMap = new Map();
  const sunsetMap = new Map();
  for (const entry of astronomy) {
    sunriseMap.set(entry.date, entry.sunrise ? hourIso(entry.sunrise) : null);
    sunsetMap.set(entry.date, entry.sunset ? hourIso(entry.sunset) : null);
  }

  const bands = [];
  let currentBandStart = null;
  let inNight = false;
  for (const isoTime of timeline) {
    const localDate = formatDateKey(isoTime, timezone);
    const sunrise = sunriseMap.get(localDate);
    const sunset = sunsetMap.get(localDate);
    const nightAtThisHour = (sunrise && isoTime < sunrise) || (sunset && isoTime >= sunset);
    if (nightAtThisHour && !inNight) {
      currentBandStart = isoTime;
      inNight = true;
    }
    if (!nightAtThisHour && inNight) {
      bands.push([{ xAxis: currentBandStart }, { xAxis: isoTime }]);
      currentBandStart = null;
      inNight = false;
    }
  }
  if (inNight && currentBandStart) {
    bands.push([{ xAxis: currentBandStart }, { xAxis: timeline[timeline.length - 1] }]);
  }
  return bands;
}

export function createProviderLookup() {
  return new Map(PROVIDERS.map((provider) => [provider.id, provider]));
}

function buildNwsQuantitativePrecipMap(values) {
  const entries = new Map();

  for (const item of values) {
    if (!item?.validTime) {
      continue;
    }
    const [startPart, durationPart = "PT1H"] = item.validTime.split("/");
    const start = new Date(startPart);
    const durationHours = parseIsoDurationHours(durationPart);
    const amount = typeof item.value === "number" ? round(item.value, 2) : null;
    const perHourAmount = amount === null
      ? null
      : durationHours > 0
        ? round(amount / durationHours, 2)
        : amount;

    for (let hourOffset = 0; hourOffset < Math.max(1, durationHours); hourOffset += 1) {
      const current = new Date(start);
      current.setUTCHours(start.getUTCHours() + hourOffset);
      entries.set(hourIso(current), {
        precipMm: perHourAmount
      });
    }
  }

  return entries;
}

function buildNwsGridValueMap(values) {
  const entries = new Map();

  for (const item of values) {
    if (!item?.validTime) {
      continue;
    }
    const [startPart, durationPart = "PT1H"] = item.validTime.split("/");
    const start = new Date(startPart);
    const durationHours = parseIsoDurationHours(durationPart);
    const normalizedValue = typeof item.value === "number" ? normalizedChancePct(item.value) : null;

    for (let hourOffset = 0; hourOffset < Math.max(1, durationHours); hourOffset += 1) {
      const current = new Date(start);
      current.setUTCHours(start.getUTCHours() + hourOffset);
      entries.set(hourIso(current), {
        value: normalizedValue
      });
    }
  }

  return entries;
}

function parseIsoDurationHours(durationText) {
  const days = Number(durationText.match(/(\d+)D/)?.[1] ?? 0);
  const hours = Number(durationText.match(/(\d+)H/)?.[1] ?? 0);
  return days * 24 + hours || 1;
}

