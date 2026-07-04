import {
  APP_VERSION,
  CACHE_TTL_MS,
  DEFAULT_LOCATION,
  DEFAULT_LOCATION_QUERY,
  PROVIDERS,
  PROVIDER_STATUS,
  THEMES,
  buildDayNightBands,
  buildMidnightMarks,
  createProviderLookup,
  createUnifiedTimeline,
  emptyForecast,
  normalizeOpenMeteo
} from "./shared/forecast-core.js";
import { getProviderDescriptors } from "./shared/provider-registry.js";

const state = {
  locationQuery: DEFAULT_LOCATION_QUERY,
  location: null,
  selectedProviders: [],
  themeId: THEMES[0].id,
  forecasts: new Map(),
  selectedHourIso: null,
  selectedHourByProvider: new Map(),
  refreshStartedAt: null,
  progress: 0
};

const providerLookup = createProviderLookup();
const GITHUB_PAGES_BASE_PATH = "/SkyDiff2/";
const isGitHubPagesHost = window.location.hostname.endsWith("github.io");
const isGitHubPagesPath = window.location.pathname.startsWith(GITHUB_PAGES_BASE_PATH);
const STATIC_PAGES_MODE = isGitHubPagesHost || isGitHubPagesPath;
const SERVER_REQUIRED_PROVIDER_NOTE = "Unavailable in the GitHub Pages static PWA. Run the local Node server for this provider.";
const TEMP_GRADIENT_ANCHORS = [
  { t: -20, c: "#b58ae6" },
  { t: -10, c: "#cf89df" },
  { t: 0, c: "#fe50ff" },
  { t: 10, c: "#5050fe" },
  { t: 20, c: "#5094ff" },
  { t: 30, c: "#93ffff" },
  { t: 40, c: "#94ff95" },
  { t: 50, c: "#ffd950" },
  { t: 60, c: "#ffb850" },
  { t: 70, c: "#ff9450" },
  { t: 80, c: "#fe724f" },
  { t: 90, c: "#d85050" },
  { t: 100, c: "#b75051" },
  { t: 110, c: "#945051" }
].sort((a, b) => a.t - b.t);
const ui = {
  progressBar: document.querySelector("#progress-bar"),
  locationInput: document.querySelector("#location-input"),
  fetchButton: document.querySelector("#fetch-button"),
  themeButton: document.querySelector("#theme-button"),
  reloadButton: document.querySelector("#reload-button"),
  locationLabel: document.querySelector("#location-label"),
  cacheLabel: document.querySelector("#cache-label"),
  providerSummary: document.querySelector("#provider-summary"),
  providerToggles: document.querySelector("#provider-toggles"),
  combinedChart: document.querySelector("#combined-chart"),
  cardGrid: document.querySelector("#individual-charts"),
  versionLabel: document.querySelector("#version-label"),
  updatedLabel: document.querySelector("#updated-label"),
  themeLabel: document.querySelector("#theme-label"),
  toggleTemplate: document.querySelector("#provider-toggle-template"),
  cardTemplate: document.querySelector("#provider-card-template"),
  dataModal: document.querySelector("#data-modal"),
  dataModalFamily: document.querySelector("#data-modal-family"),
  dataModalTitle: document.querySelector("#data-modal-title"),
  dataModalNote: document.querySelector("#data-modal-note"),
  dataGridWrap: document.querySelector("#data-grid-wrap"),
  dataModalClose: document.querySelector("#data-modal-close"),
  recentRainChart: document.querySelector("#recent-rain-chart"),
  nextHourRainChart: document.querySelector("#next-hour-rain-chart"),
  recentRainStatus: document.querySelector("#recent-rain-status"),
  nextHourRainStatus: document.querySelector("#next-hour-rain-status"),
  recentRainDataButton: document.querySelector("#recent-rain-data-button"),
  nextHourRainDataButton: document.querySelector("#next-hour-rain-data-button")
};

const INTENSITY_LABELS = ["None", "Light", "Moderate", "Heavy"];
const INTENSITY_COLORS = ["#3a3f52", "#4cc9f0", "#ffd166", "#ff6b6b"];

class StorageService {
  constructor(prefix) {
    this.prefix = prefix;
    this.ensureVersion();
  }

  key(name) {
    return `${this.prefix}:${name}`;
  }

  ensureVersion() {
    const existingVersion = localStorage.getItem(this.key("version"));
    if (existingVersion !== APP_VERSION) {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(`${this.prefix}:cache:`))
        .forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(this.key("version"), APP_VERSION);
    }
  }

  read(name, fallback = null) {
    const raw = localStorage.getItem(this.key(name));
    return raw ? JSON.parse(raw) : fallback;
  }

  write(name, value) {
    localStorage.setItem(this.key(name), JSON.stringify(value));
  }

  readCache(cacheKey) {
    const entry = this.read(`cache:${cacheKey}`);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(this.key(`cache:${cacheKey}`));
      return null;
    }
    return entry.payload;
  }

  writeCache(cacheKey, payload) {
    this.write(`cache:${cacheKey}`, { savedAt: Date.now(), payload });
  }
}

function timelineHours(location, status, note) {
  return emptyForecast("static", location, createUnifiedTimeline(), status, note).hours;
}

function buildStaticUnavailableForecast(providerId, location, note) {
  return {
    providerId,
    location,
    fetchedAt: new Date().toISOString(),
    status: PROVIDER_STATUS.SETUP_REQUIRED,
    note,
    hours: timelineHours(location, PROVIDER_STATUS.SETUP_REQUIRED, note)
  };
}

function parseCoordinateQuery(query) {
  const match = String(query || "").trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) {
    return null;
  }
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }
  return {
    displayName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat,
    lon,
    countryCode: "",
    postalCode: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

async function resolveZipStatic(query) {
  const trimmed = String(query || "").trim();
  if (!/^\d{5}$/.test(trimmed)) {
    return null;
  }
  const response = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(trimmed)}`);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  const place = payload.places?.[0];
  if (!place) {
    return null;
  }
  return {
    displayName: `${place["place name"]}, ${place["state abbreviation"]} ${trimmed}`,
    lat: Number(place.latitude),
    lon: Number(place.longitude),
    countryCode: payload["country abbreviation"] || "US",
    postalCode: trimmed,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

async function resolveOpenMeteoStatic(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", String(query || "").trim());
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Location lookup failed.");
  }
  const payload = await response.json();
  const result = payload.results?.[0];
  if (!result) {
    throw new Error("No location match found.");
  }
  return {
    displayName: [result.name, result.admin1, result.country_code].filter(Boolean).join(", "),
    lat: result.latitude,
    lon: result.longitude,
    countryCode: result.country_code || "",
    postalCode: "",
    timezone: result.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

async function resolveLocationStatic(query) {
  const trimmed = String(query || "").trim() || DEFAULT_LOCATION_QUERY;
  const coords = parseCoordinateQuery(trimmed);
  if (coords) {
    return coords;
  }
  const zipLocation = await resolveZipStatic(trimmed).catch(() => null);
  if (zipLocation) {
    return zipLocation;
  }
  if (trimmed === DEFAULT_LOCATION_QUERY) {
    return DEFAULT_LOCATION;
  }
  return resolveOpenMeteoStatic(trimmed);
}
class ForecastService {
  constructor(storage) {
    this.storage = storage;
    this.inflight = new Map();
  }

  async resolveLocation(query) {
    if (STATIC_PAGES_MODE) {
      return resolveLocationStatic(query);
    }

    const response = await fetch(`/api/resolve?q=${encodeURIComponent(query)}`);
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Location lookup failed.");
    }
    return payload.location;
  }

  cacheKey(providerId, location) {
    return `${APP_VERSION}:${providerId}:${location.lat.toFixed(3)}:${location.lon.toFixed(3)}`;
  }

  async loadProvider(providerId, location, force = false) {
    const cacheKey = this.cacheKey(providerId, location);
    if (!force) {
      const cached = this.storage.readCache(cacheKey);
      if (cached) {
        return { payload: cached, fromCache: true };
      }
    }

    if (this.inflight.has(cacheKey)) {
      return this.inflight.get(cacheKey);
    }

    const provider = providerLookup.get(providerId);
    if (STATIC_PAGES_MODE && !providerId.startsWith("openmeteo")) {
      const payload = buildStaticUnavailableForecast(providerId, location, SERVER_REQUIRED_PROVIDER_NOTE);
      this.storage.writeCache(cacheKey, payload);
      return { payload, fromCache: false };
    }

    if (providerId.startsWith("openmeteo")) {
      const pending = this.loadOpenMeteoDirect(provider, location)
        .then((payload) => {
          this.storage.writeCache(cacheKey, payload);
          return { payload, fromCache: false };
        })
        .finally(() => {
          this.inflight.delete(cacheKey);
        });
      this.inflight.set(cacheKey, pending);
      return pending;
    }

    const endpoint = this.endpointForProvider(provider);
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lon));
    url.searchParams.set("name", location.displayName);
    url.searchParams.set("countryCode", location.countryCode || "");
    url.searchParams.set("postalCode", location.postalCode || "");
    url.searchParams.set("timezone", location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (providerId.startsWith("openmeteo")) {
      url.searchParams.set("providerId", providerId);
    }

    const pending = fetch(url)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok && !(payload && payload.providerId && Array.isArray(payload.hours))) {
          throw new Error(payload.note || payload.error || `${provider.label} request failed.`);
        }
        this.storage.writeCache(cacheKey, payload);
        return { payload, fromCache: false };
      })
      .finally(() => {
        this.inflight.delete(cacheKey);
      });
    this.inflight.set(cacheKey, pending);
    return pending;
  }

  async loadOpenMeteoDirect(provider, location) {
    const endpoint = provider.id === "openmeteo_ecmwf"
      ? "https://api.open-meteo.com/v1/ecmwf"
      : "https://api.open-meteo.com/v1/gfs";
    const url = new URL(endpoint);
    url.searchParams.set("latitude", String(location.lat));
    url.searchParams.set("longitude", String(location.lon));
    url.searchParams.set("hourly", "temperature_2m,precipitation,precipitation_probability");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("precipitation_unit", "mm");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("past_hours", "4");
    url.searchParams.set("forecast_hours", "72");
    url.searchParams.set("daily", "sunrise,sunset");

    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.reason || payload.error || `${provider.label} request failed.`);
    }
    return normalizeOpenMeteo(
      payload,
      createUnifiedTimeline(),
      { ...location, timezone: payload.timezone || location.timezone },
      provider.id
    );
  }

  buildLocationFromGeocodeResult(result) {
    return {
      displayName: [result.name, result.admin1, result.country_code].filter(Boolean).join(", "),
      lat: result.latitude,
      lon: result.longitude,
      countryCode: result.country_code || "",
      postalCode: "",
      timezone: result.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  endpointForProvider(provider) {
    switch (provider.id) {
      case "nws":
        return "/api/nws";
      case "openmeteo_gfs":
      case "openmeteo_ecmwf":
        return "/api/openmeteo";
      case "weatherapi":
        return "/api/weatherapi";
      case "openweather":
        return "/api/openweather";
      case "forecastpro":
        return "/api/forecastpro";
      case "wxdata":
        return "/api/wxdata";
      case "weatherdb":
        return "/api/weatherdb";
      case "pirateweather":
        return "/api/pirateweather";
      case "tomorrowio":
        return "/api/tomorrowio";
      default:
        return "/api/health";
    }
  }
}

class ChartRenderer {
  constructor() {
    this.combined = echarts.init(ui.combinedChart, null, { renderer: "canvas" });
    this.individual = new Map();
    this.resizeFrame = null;
    window.addEventListener("resize", () => {
      this.scheduleResize();
    });
  }

  scheduleResize() {
    if (this.resizeFrame) {
      cancelAnimationFrame(this.resizeFrame);
    }
    this.resizeFrame = requestAnimationFrame(() => {
      this.combined.resize();
      this.individual.forEach((chart) => chart.resize());
      this.resizeFrame = null;
    });
  }

  baseOption(title, timeline, theme, nightBands, midnightMarks) {
    return {
      backgroundColor: "transparent",
      animationDuration: 400,
      title: title ? { text: title, textStyle: { color: getCssVar("--text"), fontFamily: "Space Grotesk" } } : undefined,
      legend: {
        top: 6,
        textStyle: { color: getCssVar("--text") }
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8, 13, 20, 0.92)",
        borderWidth: 0,
        textStyle: { color: "#f8fbff" },
        valueFormatter(value) {
          return value === null || value === undefined ? "n/a" : `${value}`;
        }
      },
      grid: { left: 56, right: 24, top: 70, bottom: 40, containLabel: true },
      xAxis: {
        type: "category",
        data: timeline,
        axisLabel: {
          color: getCssVar("--muted"),
          formatter(value) {
            return formatCompactHourLabel(value);
          }
        },
        axisLine: { lineStyle: { color: getCssVar("--line") } },
        splitLine: { show: false }
      },
      yAxis: [
        {
          type: "value",
          name: "Temp (F)",
          nameTextStyle: { color: getCssVar("--muted") },
          axisLabel: { color: getCssVar("--muted") },
          splitLine: { lineStyle: { color: getCssVar("--line") } }
        },
        {
          type: "value",
          name: "Precip Accum. (mm)",
          nameTextStyle: { color: getCssVar("--muted") },
          min: 0,
          max: 5,
          interval: 1,
          splitNumber: 5,
          axisLabel: {
            color: getCssVar("--muted"),
            formatter(value) {
              return `${Math.round(value)}`;
            }
          },
          axisTick: { show: true },
          splitLine: { show: false }
        },
        {
          type: "value",
          show: false,
          min: 0,
          max: 100,
          offset: 56,
          nameTextStyle: { color: getCssVar("--muted") },
          axisLabel: { show: false },
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: { show: false }
        }
      ],
      series: [],
      dataZoom: [
        {
          type: "slider",
          bottom: 6,
          brushSelect: false,
          borderColor: "transparent",
          backgroundColor: "rgba(255,255,255,0.05)",
          fillerColor: "rgba(255,255,255,0.1)",
          textStyle: { color: getCssVar("--muted") }
        }
      ]
    };
  }

  renderCombined(forecasts, location, theme) {
    const timeline = createUnifiedTimeline();
    const astronomySource = forecasts.find((forecast) => forecast.astronomy?.length) || { astronomy: [] };
    const nightBands = buildDayNightBands(timeline, location?.timezone || "UTC", astronomySource.astronomy);
    const midnightMarks = buildMidnightMarks(timeline, location?.timezone || "UTC");
    const option = this.baseOption("", timeline, theme, nightBands, midnightMarks);

    const activeForecasts = forecasts.filter((forecast) => forecast.selected);
    const timelineIndexByIso = new Map(timeline.map((iso, index) => [iso, index]));
    const accumAxis = buildAccumAxisConfig(
      activeForecasts.flatMap((forecast) => forecast.hours.map((hour) => hour.precipMm))
    );
    option.tooltip = {
      ...option.tooltip,
      formatter: (params) => {
        const points = Array.isArray(params) ? params : [params];
        const isoTime = points?.[0]?.axisValue;
        if (!isoTime) {
          return "No data";
        }

        const hourIndex = timelineIndexByIso.get(isoTime);
        if (hourIndex === undefined) {
          return formatTooltipDateTime(isoTime);
        }

        const rows = activeForecasts.map((forecast) => {
          const provider = providerLookup.get(forecast.providerId);
          const hour = forecast.hours[hourIndex] || {};
          const temp = Number.isFinite(hour.tempF) ? hour.tempF.toFixed(1) : "n/a";
          const chance = Number.isFinite(hour.precipChancePct) ? Math.round(hour.precipChancePct) : "n/a";
          const accum = Number.isFinite(hour.precipMm) ? hour.precipMm.toFixed(2) : "n/a";

          return `
            <tr style="line-height:1.05;">
              <td style="padding:2px 6px 2px 0; text-align:left; white-space:nowrap;">${provider?.label || forecast.providerId}</td>
              <td style="padding:2px 6px; text-align:right; white-space:nowrap;">${temp}</td>
              <td style="padding:2px 6px; text-align:right; white-space:nowrap;">${chance}</td>
              <td style="padding:2px 0 2px 6px; text-align:right; white-space:nowrap;">${accum}</td>
            </tr>
          `;
        }).join("");

        return `
          <div style="display:inline-block; width:max-content; padding-right:0;">
            <div style="margin-bottom:6px; font-weight:600; font-size:12px; line-height:1.2;">${formatTooltipDateTime(isoTime)}</div>
            <table style="display:inline-table; width:auto; table-layout:auto; border-collapse:collapse; font-size:11px; line-height:1.05;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.2); line-height:1;">
                  <th style="padding:0 6px 3px 0; text-align:left; color:#b7c6df; font-weight:600; white-space:nowrap;">Model</th>
                  <th style="padding:0 6px 3px; text-align:right; color:#b7c6df; font-weight:600; white-space:nowrap;">&deg;F</th>
                  <th style="padding:0 6px 3px; text-align:right; color:#b7c6df; font-weight:600; white-space:nowrap;">%</th>
                  <th style="padding:0 0 3px 6px; text-align:right; color:#b7c6df; font-weight:600; white-space:nowrap;">mm</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      }
    };
    option.legend.data = [];
    option.yAxis[1] = {
      ...option.yAxis[1],
      ...accumAxis
    };

    for (const forecast of activeForecasts) {
      const provider = providerLookup.get(forecast.providerId);
      option.legend.data.push(provider.label);
      option.series.push({
        name: provider.label,
        type: "line",
        smooth: true,
        yAxisIndex: 0,
        showSymbol: false,
        emphasis: { focus: "series" },
        lineStyle: {
          width: 3,
          type: provider.tempStyle || "solid",
          color: provider.color
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${provider.color}66` },
            { offset: 1, color: `${provider.color}00` }
          ])
        },
        markArea: option.series.length === 0 ? {
          silent: true,
          itemStyle: { color: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(20,30,60,0.05)" },
          data: nightBands
        } : undefined,
        markLine: option.series.length === 0 ? {
          silent: true,
          symbol: ["none", "none"],
          lineStyle: { color: getCssVar("--line"), type: "dashed" },
          label: {
            show: true,
            formatter(params) {
              return params.data?.labelFormatter === "midnight"
                ? formatMidnightHeaderLabel(params.value)
                : "";
            },
            color: getCssVar("--muted"),
            fontSize: 12,
            distance: 8
          },
          data: buildChartMarkerLines(midnightMarks, state.selectedHourIso)
        } : undefined,
        data: forecast.hours.map((hour) => hour.tempF)
      });

      option.series.push({
        name: `${provider.label} chance`,
        type: "line",
        smooth: true,
        yAxisIndex: 2,
        showSymbol: false,
        z: 6,
        lineStyle: {
          width: 3,
          type: "dotted",
          color: provider.color,
          opacity: 1
        },
        itemStyle: {
          color: provider.color,
          borderColor: "#ffffff",
          borderWidth: 1
        },
        emphasis: { focus: "series" },
        data: forecast.hours.map((hour) => hour.precipChancePct)
      });

      if (shouldShowAccumBars(provider, forecast)) {
        option.series.push({
          name: `${provider.label} accum`,
          type: "bar",
          yAxisIndex: 1,
          barGap: "-85%",
          barMaxWidth: 9,
          itemStyle: {
            color: `${provider.color}99`,
            borderRadius: [6, 6, 0, 0]
          },
          emphasis: { focus: "series" },
          data: forecast.hours.map((hour) => hour.precipMm)
        });
      }
    }

    this.combined.setOption(option, true);
    this.bindChartSelection(this.combined, null);
    this.scheduleResize();
  }

  renderCards(forecasts, location, theme) {
    ui.cardGrid.replaceChildren();
    this.individual.forEach((chart) => chart.dispose());
    this.individual.clear();
    const timeline = createUnifiedTimeline();
    const visibleForecasts = forecasts.filter((forecast) => forecast.selected);

    for (const forecast of visibleForecasts) {
      const provider = providerLookup.get(forecast.providerId);
      const card = ui.cardTemplate.content.firstElementChild.cloneNode(true);
      card.querySelector(".provider-family").textContent = provider.family;
      card.querySelector(".provider-title").textContent = provider.label;
      const providerNote = card.querySelector(".provider-note");
      const detailNote = buildDisplayNote(provider, forecast);
      providerNote.textContent = detailNote;
      const pill = card.querySelector(".status-pill");
      pill.textContent = forecast.status.replaceAll("_", " ");
      pill.classList.add(forecast.status);
      pill.addEventListener("click", () => {
        openDataModal(provider, forecast);
      });
      const chartNode = card.querySelector(".provider-chart");
      ui.cardGrid.append(card);

      const chart = echarts.init(chartNode, null, { renderer: "canvas" });
      this.individual.set(forecast.providerId, chart);
      const nightBands = buildDayNightBands(timeline, location?.timezone || "UTC", forecast.astronomy || []);
      const midnightMarks = buildMidnightMarks(timeline, location?.timezone || "UTC");
      const option = this.baseOption("", timeline, theme, nightBands, midnightMarks);
      const tempAreaFill = buildTemperatureAreaFill(forecast.hours.map((hour) => hour.tempF));
      const accumAxis = buildAccumAxisConfig(forecast.hours.map((hour) => hour.precipMm));
      option.legend = { show: false };
      option.grid = { left: 48, right: 18, top: 44, bottom: 34, containLabel: true };
      option.dataZoom = [];
      if (tempAreaFill) {
        option.yAxis[0].min = tempAreaFill.min;
        option.yAxis[0].max = tempAreaFill.max;
      }
      option.yAxis[1] = {
        ...option.yAxis[1],
        ...accumAxis
      };
      option.series = [
        {
          name: provider.label,
          type: "line",
          smooth: true,
          yAxisIndex: 0,
          showSymbol: false,
          lineStyle: { width: 3, type: provider.tempStyle, color: provider.color },
          itemStyle: { color: provider.color },
          areaStyle: tempAreaFill ? { color: tempAreaFill.gradient } : undefined,
          markArea: {
            silent: true,
            itemStyle: { color: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(20,30,60,0.05)" },
            data: nightBands
          },
          markLine: {
            silent: true,
            symbol: ["none", "none"],
            lineStyle: { color: getCssVar("--line"), type: "dashed" },
            label: {
              show: true,
              formatter(params) {
                return params.data?.labelFormatter === "midnight"
                  ? formatMidnightHeaderLabel(params.value)
                  : "";
              },
              color: getCssVar("--muted"),
              fontSize: 10,
              distance: 4
            },
            data: buildChartMarkerLines(
              midnightMarks,
              state.selectedHourByProvider.get(forecast.providerId) || state.selectedHourIso
            )
          },
          data: forecast.hours.map((hour) => hour.tempF)
        },
        {
          name: `${provider.label} chance`,
          type: "line",
          smooth: true,
          yAxisIndex: 2,
          showSymbol: false,
          z: 6,
          lineStyle: { width: 3, type: "dotted", color: provider.color, opacity: 1 },
          itemStyle: { color: provider.color, borderColor: "#ffffff", borderWidth: 1 },
          data: forecast.hours.map((hour) => hour.precipChancePct)
        },
        ...(shouldShowAccumBars(provider, forecast)
          ? [{
            name: `${provider.label} accum`,
            type: "bar",
            yAxisIndex: 1,
            barMaxWidth: 12,
            itemStyle: { color: `${provider.color}88`, borderRadius: [8, 8, 0, 0] },
            data: forecast.hours.map((hour) => hour.precipMm)
          }]
          : [])
      ];
      chart.setOption(option, true);
      this.bindChartSelection(chart, forecast.providerId);
    }
    this.scheduleResize();
  }

  bindChartSelection(chart, providerId) {
    const zr = chart.getZr();
    zr.off("click");
    zr.on("click", (event) => {
      const selectedHour = getSelectedHourFromChartClick(chart, event.offsetX, event.offsetY);
      if (!selectedHour) {
        return;
      }
      state.selectedHourIso = selectedHour;
      if (providerId) {
        state.selectedHourByProvider.set(providerId, selectedHour);
      }
      renderAll();
    });
  }
}

class NowcastService {
  constructor() {
    this.cache = new Map();
    this.inflight = new Map();
    this.refreshTimer = null;
    this.cacheTtlMs = 10 * 60 * 1000;
  }

  cacheKey(source, location) {
    return `${source}:${location.lat.toFixed(3)}:${location.lon.toFixed(3)}`;
  }

  readCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }
    if (Date.now() - cached.savedAt > this.cacheTtlMs) {
      this.cache.delete(cacheKey);
      return null;
    }
    return cached.payload;
  }

  writeCache(cacheKey, payload) {
    this.cache.set(cacheKey, {
      savedAt: Date.now(),
      payload
    });
  }

  endpointForSource(source) {
    return source === "rainviewer" ? "/api/rainviewer" : "/api/rainbownowcast";
  }

  async loadSource(source, location, force = false) {
    if (STATIC_PAGES_MODE) {
      return {
        source,
        fetchedAt: new Date().toISOString(),
        note: "Unavailable in the GitHub Pages static PWA. Run the local Node server for nowcast data.",
        points: []
      };
    }

    const cacheKey = this.cacheKey(source, location);
    if (!force) {
      const cached = this.readCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    if (this.inflight.has(cacheKey)) {
      return this.inflight.get(cacheKey);
    }

    const endpoint = this.endpointForSource(source);
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lon));
    url.searchParams.set("name", location.displayName || "");
    url.searchParams.set("countryCode", location.countryCode || "");
    url.searchParams.set("postalCode", location.postalCode || "");
    url.searchParams.set("timezone", location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

    const pending = fetch(url)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.note || payload?.error || `Failed loading ${source}`);
        }
        this.writeCache(cacheKey, payload);
        return payload;
      })
      .finally(() => {
        this.inflight.delete(cacheKey);
      });

    this.inflight.set(cacheKey, pending);
    return pending;
  }

  startAutoRefresh(getLocation) {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(async () => {
      const location = getLocation();
      if (!location) {
        return;
      }
      try {
        await refreshNowcast(location, true);
      } catch {
        // Ignore periodic refresh failures; charts keep last successful payload.
      }
    }, this.cacheTtlMs);
  }
}

class NowcastChartRenderer {
  constructor() {
    this.recentRain = ui.recentRainChart ? echarts.init(ui.recentRainChart, null, { renderer: "canvas" }) : null;
    this.nextHourRain = ui.nextHourRainChart ? echarts.init(ui.nextHourRainChart, null, { renderer: "canvas" }) : null;
    this.recentRainPayload = null;
    this.nextHourRainPayload = null;
    window.addEventListener("resize", () => {
      this.recentRain?.resize();
      this.nextHourRain?.resize();
    });
  }

  buildSeries(points) {
    return points.map((point) => ({
      value: point.precipitationIntensity,
      itemStyle: {
        color: INTENSITY_COLORS[point.precipitationIntensity] || INTENSITY_COLORS[0]
      }
    }));
  }

  buildOption(title, points) {
    const labels = points.map((point) => {
      const date = new Date(point.timestamp);
      const hours = date.getHours() % 12 || 12;
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    });
    const hasNoPoints = points.length === 0;
    const allZero = points.length > 0 && points.every((point) => point.precipitationIntensity === 0);
    return {
      animationDuration: 260,
      backgroundColor: "transparent",
      graphic: (hasNoPoints || allZero) ? [{
        type: "text",
        left: "center",
        top: "middle",
        silent: true,
        style: {
          text: hasNoPoints ? "No API rows returned" : "No rain detected",
          fill: "rgba(147, 166, 198, 0.78)",
          font: "600 14px IBM Plex Sans, sans-serif"
        }
      }] : [],
      grid: {
        left: 46,
        right: 14,
        top: 32,
        bottom: 34
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const item = params?.[0];
          if (!item) {
            return "No data";
          }
          const sourcePoint = points[item.dataIndex];
          const rate = sourcePoint?.precipRate;
          const rateText = Number.isFinite(rate) ? `${rate.toFixed(2)} mm/h` : "n/a";
          return `${item.axisValue}<br/>Intensity: ${INTENSITY_LABELS[item.value] || "None"}<br/>Rate: ${rateText}`;
        }
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: {
          color: getCssVar("--muted"),
          interval: Math.max(0, Math.floor(labels.length / 8))
        },
        axisLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.16)"
          }
        }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 3,
        interval: 1,
        axisLabel: {
          color: getCssVar("--muted"),
          formatter: (value) => INTENSITY_LABELS[value] || ""
        },
        splitLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.1)"
          }
        }
      },
      series: [
        {
          name: title,
          type: "bar",
          barMaxWidth: labels.length > 30 ? 8 : 14,
          barMinHeight: 2,
          markLine: {
            silent: true,
            symbol: ["none", "none"],
            lineStyle: {
              color: "rgba(147, 166, 198, 0.24)",
              type: "dashed",
              width: 1
            },
            data: [{ yAxis: 0 }]
          },
          data: this.buildSeries(points)
        }
      ]
    };
  }

  renderRecentRain(payload) {
    if (!this.recentRain) {
      return;
    }
    this.recentRainPayload = payload;
    const points = payload?.points || [];
    if (ui.recentRainStatus) {
      ui.recentRainStatus.textContent = payload?.note || (points.length ? "Radar frames loaded" : "Radar data unavailable");
    }
    this.recentRain.setOption(this.buildOption("Recent Rain (Radar)", points), true);
  }

  renderNextHour(payload) {
    if (!this.nextHourRain) {
      return;
    }
    this.nextHourRainPayload = payload;
    const points = payload?.points || [];
    if (ui.nextHourRainStatus) {
      ui.nextHourRainStatus.textContent = payload?.note || (points.length ? "Nowcast loaded" : "Nowcast data unavailable");
    }
    this.nextHourRain.setOption(this.buildOption("Next Hour Rain (Nowcast)", points), true);
  }
}

function buildChartMarkerLines(midnightMarks, selectedHourIso) {
  const markers = midnightMarks.map((mark) => ({
    ...mark,
    labelFormatter: "midnight"
  }));

  if (selectedHourIso) {
    markers.push({
      xAxis: selectedHourIso,
      value: selectedHourIso,
      labelFormatter: "selected",
      lineStyle: {
        color: getCssVar("--accent"),
        width: 2,
        type: "solid"
      }
    });
  }

  return markers;
}

function getSelectedHourFromChartClick(chart, offsetX, offsetY) {
  const point = [offsetX, offsetY];
  const option = chart.getOption();
  const timeline = option?.xAxis?.[0]?.data || [];
  if (!timeline.length) {
    return null;
  }

  const inGrid = chart.containPixel({ gridIndex: 0 }, point);
  if (!inGrid) {
    return null;
  }

  const axisValue = chart.convertFromPixel({ xAxisIndex: 0 }, offsetX);
  const axisIndex = typeof axisValue === "number" ? Math.round(axisValue) : Number(axisValue);
  if (!Number.isFinite(axisIndex)) {
    return null;
  }

  const clampedIndex = Math.max(0, Math.min(timeline.length - 1, axisIndex));
  return timeline[clampedIndex];
}

function formatModalTime(isoTime) {
  return new Date(isoTime).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatCellValue(value) {
  return value === null || value === undefined ? "—" : String(value);
}

function hasAccumPrecipData(forecast) {
  return forecast.hours.some((hour) => hour.precipMm !== null && hour.precipMm !== undefined);
}

function hasPrecipChanceData(forecast) {
  return forecast.hours.some((hour) => hour.precipChancePct !== null && hour.precipChancePct !== undefined);
}

function shouldShowAccumBars(provider, forecast) {
  if (provider?.id === "nws") {
    return false;
  }
  return hasAccumPrecipData(forecast);
}

function buildProviderDetailNote(forecast) {
  const notes = [];
  if (forecast.note && !forecast.note.includes("NOAA debug sample:")) {
    notes.push(forecast.note);
  }
  if (forecast.providerId === "nws") {
    notes.push("NOAA is plotted with Precipitation Potential (%) as a chance line instead of accumulated precipitation bars.");
  }
  if (!hasAccumPrecipData(forecast)) {
    notes.push("Accumulated precipitation in mm is not available for this provider/location.");
  }
  if (!hasPrecipChanceData(forecast)) {
    notes.push("Precipitation chance (%) is not available for this provider/location.");
  }
  return notes.join(" ");
}

function buildDisplayNote(provider, forecast) {
  return buildProviderDetailNote(forecast) || "Forecast loaded.";
}

function openDataModal(provider, forecast) {
  ui.dataModalFamily.textContent = provider.family;
  ui.dataModalTitle.textContent = `${provider.label} data`;
  const detailNote = buildDisplayNote(provider, forecast) || "Normalized hourly data loaded into this chart.";
  ui.dataModalNote.textContent = detailNote;
  renderDataGrid(forecast, getDefaultSelectedRow(forecast), 0);
  ui.dataModal.showModal();
}

function openNowcastDataModal(title, family, payload) {
  ui.dataModalFamily.textContent = family;
  ui.dataModalTitle.textContent = `${title} data`;
  const points = payload?.points || [];
  const fetchedAt = payload?.fetchedAt ? ` Fetched ${formatModalTime(payload.fetchedAt)}.` : "";
  ui.dataModalNote.textContent = `${payload?.note || "Normalized realtime rain data loaded into this chart."}${fetchedAt}`;
  renderNowcastDataGrid(points);
  ui.dataModal.showModal();
}

function getDefaultSelectedRow(forecast) {
  const selectedHour = state.selectedHourByProvider.get(forecast.providerId) || state.selectedHourIso;
  if (selectedHour) {
    const selectedIndex = forecast.hours.findIndex((hour) => hour.isoTime === selectedHour);
    if (selectedIndex >= 0) {
      return selectedIndex;
    }
  }

  const now = new Date();
  now.setMinutes(0, 0, 0);
  const currentIso = now.toISOString();
  const currentIndex = forecast.hours.findIndex((hour) => hour.isoTime === currentIso);
  if (currentIndex >= 0) {
    return currentIndex;
  }

  return 0;
}

function renderDataGrid(forecast, selectedRow = 0, selectedCol = 1) {
  const accumAvailable = hasAccumPrecipData(forecast);
  const chanceAvailable = hasPrecipChanceData(forecast);
  const columns = [
    { key: "isoTime", label: "Time" },
    { key: "tempF", label: "Temp (F)" },
    {
      key: "precipMm",
      label: accumAvailable ? "Precip Accum. (mm)" : "Precip Accum. (mm) - Unavailable"
    },
    {
      key: "precipChancePct",
      label: chanceAvailable ? "Precip Chance (%)" : "Precip Chance (%) - Unavailable"
    },
    { key: "isForecast", label: "Real Forecast Data" },
    { key: "isPastFill", label: "Missing / Inserted Row" }
  ];

  const table = document.createElement("table");
  table.className = "data-grid";
  table.dataset.selectedRow = String(selectedRow);
  table.dataset.selectedCol = String(selectedCol);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach((column, colIndex) => {
    const th = document.createElement("th");
    th.textContent = column.label;
    th.dataset.col = String(colIndex);
    if (colIndex === selectedCol) {
      th.classList.add("is-selected-col");
    }
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  forecast.hours.forEach((hour, rowIndex) => {
    const tr = document.createElement("tr");
    if (rowIndex === selectedRow) {
      tr.classList.add("is-selected-row");
    }

    columns.forEach((column, colIndex) => {
      const cell = document.createElement("td");
      let value = hour[column.key];
      if (column.key === "isoTime") {
        value = formatModalTime(hour.isoTime);
      } else if (column.key === "precipMm" && !accumAvailable) {
        value = "Unavailable";
      } else if (column.key === "precipChancePct" && !chanceAvailable) {
        value = "Unavailable";
      } else if (typeof value === "boolean") {
        value = value ? "Yes" : "No";
      }
      cell.textContent = formatCellValue(value);
      cell.dataset.row = String(rowIndex);
      cell.dataset.col = String(colIndex);
      if (rowIndex === selectedRow) {
        cell.classList.add("is-selected-row");
      }
      if (colIndex === selectedCol) {
        cell.classList.add("is-selected-col");
      }
      if (rowIndex === selectedRow && colIndex === selectedCol) {
        cell.classList.add("is-selected-cell");
      }
      cell.addEventListener("click", () => {
        renderDataGrid(forecast, rowIndex, colIndex);
      });
      tr.append(cell);
    });

    tbody.append(tr);
  });

  table.append(tbody);
  ui.dataGridWrap.replaceChildren(table);

  requestAnimationFrame(() => {
    const selectedCell = ui.dataGridWrap.querySelector(
      `td.is-selected-cell[data-row="${selectedRow}"][data-col="${selectedCol}"]`
    );
    if (selectedCell) {
      selectedCell.scrollIntoView({
        block: "center",
        inline: "nearest"
      });
    }
  });
}

function renderNowcastDataGrid(points, selectedRow = 0, selectedCol = 1) {
  const columns = [
    { key: "timestamp", label: "Time" },
    { key: "precipitationIntensity", label: "Intensity" },
    { key: "precipRate", label: "Rate (mm/h)" },
    { key: "source", label: "Source" }
  ];

  const table = document.createElement("table");
  table.className = "data-grid";
  table.dataset.selectedRow = String(selectedRow);
  table.dataset.selectedCol = String(selectedCol);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach((column, colIndex) => {
    const th = document.createElement("th");
    th.textContent = column.label;
    th.dataset.col = String(colIndex);
    if (colIndex === selectedCol) {
      th.classList.add("is-selected-col");
    }
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  if (!points.length) {
    const tr = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = columns.length;
    cell.className = "empty-data-cell";
    cell.textContent = "No realtime rain rows were returned by this API response.";
    tr.append(cell);
    tbody.append(tr);
  }

  points.forEach((point, rowIndex) => {
    const tr = document.createElement("tr");
    if (rowIndex === selectedRow) {
      tr.classList.add("is-selected-row");
    }

    columns.forEach((column, colIndex) => {
      const cell = document.createElement("td");
      let value = point[column.key];
      if (column.key === "timestamp") {
        value = formatModalTime(value);
      } else if (column.key === "precipitationIntensity") {
        value = INTENSITY_LABELS[value] || "None";
      } else if (column.key === "precipRate") {
        value = Number.isFinite(value) ? value.toFixed(2) : "Unavailable";
      }
      cell.textContent = formatCellValue(value);
      cell.dataset.row = String(rowIndex);
      cell.dataset.col = String(colIndex);
      if (rowIndex === selectedRow) {
        cell.classList.add("is-selected-row");
      }
      if (colIndex === selectedCol) {
        cell.classList.add("is-selected-col");
      }
      if (rowIndex === selectedRow && colIndex === selectedCol) {
        cell.classList.add("is-selected-cell");
      }
      cell.addEventListener("click", () => {
        renderNowcastDataGrid(points, rowIndex, colIndex);
      });
      tr.append(cell);
    });
    tbody.append(tr);
  });

  table.append(tbody);
  ui.dataGridWrap.replaceChildren(table);
}

function formatCompactHourLabel(isoTime) {
  const date = new Date(isoTime);
  let hours = date.getHours();
  const suffix = hours >= 12 ? "p" : "a";
  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }
  return `${hours}${suffix}`;
}

function formatMidnightHeaderLabel(isoTime) {
  const date = new Date(isoTime);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday}, ${month} ${date.getDate()}`;
}

function formatTooltipDateTime(isoTime) {
  const date = new Date(isoTime);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  return `${weekday} ${month} ${day}, ${time}`;
}

const storage = new StorageService("skydiff2");
const forecastService = new ForecastService(storage);
const charts = new ChartRenderer();
const nowcastService = new NowcastService();
const nowcastCharts = new NowcastChartRenderer();

async function refreshNowcast(location, force = false) {
  const [recentRain, nextHourRain] = await Promise.all([
    nowcastService.loadSource("rainviewer", location, force).catch((error) => ({
      source: "rainviewer",
      fetchedAt: new Date().toISOString(),
      note: error.message,
      points: []
    })),
    nowcastService.loadSource("rainbow", location, force).catch((error) => ({
      source: "rainbow",
      fetchedAt: new Date().toISOString(),
      note: error.message,
      points: []
    }))
  ]);

  nowcastCharts.renderRecentRain(recentRain);
  nowcastCharts.renderNextHour(nextHourRain);
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function updateThemeColorMeta() {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", getCssVar("--surface") || "#08131a");
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const swUrl = new URL("./sw.js", window.location.href);
    await navigator.serviceWorker.register(swUrl, { type: "module" });
  } catch (error) {
    console.warn("Service worker registration failed.", error);
  }
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function mixHexColors(colorA, colorB, ratio) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const red = Math.round(a.r + ((b.r - a.r) * clampedRatio));
  const green = Math.round(a.g + ((b.g - a.g) * clampedRatio));
  const blue = Math.round(a.b + ((b.b - a.b) * clampedRatio));
  return `rgba(${red}, ${green}, ${blue}, 0.38)`;
}

function getTemperatureGradientColor(tempF) {
  if (tempF <= TEMP_GRADIENT_ANCHORS[0].t) {
    return mixHexColors(TEMP_GRADIENT_ANCHORS[0].c, TEMP_GRADIENT_ANCHORS[0].c, 0);
  }

  const lastAnchor = TEMP_GRADIENT_ANCHORS[TEMP_GRADIENT_ANCHORS.length - 1];
  if (tempF >= lastAnchor.t) {
    return mixHexColors(lastAnchor.c, lastAnchor.c, 0);
  }

  for (let index = 0; index < TEMP_GRADIENT_ANCHORS.length - 1; index += 1) {
    const current = TEMP_GRADIENT_ANCHORS[index];
    const next = TEMP_GRADIENT_ANCHORS[index + 1];
    if (tempF >= current.t && tempF <= next.t) {
      const ratio = (tempF - current.t) / (next.t - current.t);
      return mixHexColors(current.c, next.c, ratio);
    }
  }

  return mixHexColors(lastAnchor.c, lastAnchor.c, 0);
}

function buildTemperatureAreaFill(tempValues) {
  const finiteTemps = tempValues.filter((value) => Number.isFinite(value));
  if (!finiteTemps.length) {
    return null;
  }

  let min = Math.floor((Math.min(...finiteTemps) - 4) / 5) * 5;
  let max = Math.ceil((Math.max(...finiteTemps) + 4) / 5) * 5;
  if (min === max) {
    min -= 5;
    max += 5;
  }

  const range = max - min;
  const stopTemps = new Set([min, max]);
  for (const anchor of TEMP_GRADIENT_ANCHORS) {
    if (anchor.t >= min && anchor.t <= max) {
      stopTemps.add(anchor.t);
    }
  }

  const colorStops = [...stopTemps]
    .sort((a, b) => a - b)
    .map((temp) => ({
      offset: 1 - ((temp - min) / range),
      color: getTemperatureGradientColor(temp)
    }));

  return {
    min,
    max,
    gradient: new echarts.graphic.LinearGradient(0, 0, 0, 1, colorStops)
  };
}

function buildAccumAxisConfig(accumValues) {
  const finiteValues = accumValues.filter((value) => Number.isFinite(value) && value >= 0);
  const maxHourlyAccum = finiteValues.length ? Math.max(...finiteValues) : 0;

  if (maxHourlyAccum <= 2) {
    return { min: 0, max: 2, interval: 1, splitNumber: 2 };
  }
  if (maxHourlyAccum <= 5) {
    return { min: 0, max: 5, interval: 1, splitNumber: 5 };
  }
  if (maxHourlyAccum <= 10) {
    return { min: 0, max: 10, interval: 2, splitNumber: 5 };
  }
  return { min: 0, max: 15, interval: 3, splitNumber: 5 };
}

function setProgress(value, visible = true) {
  state.progress = value;
  ui.progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  ui.progressBar.style.opacity = visible ? "1" : "0";
}

function saveUiState() {
  storage.write("preferences", {
    themeId: state.themeId,
    selectedProviders: state.selectedProviders,
    locationQuery: state.locationQuery,
    location: state.location
  });
}

function loadUiState() {
  const prefs = storage.read("preferences", {});
  state.themeId = prefs.themeId || state.themeId;
  const defaultProviders = getProviderDescriptors()
    .filter((provider) => provider.status === PROVIDER_STATUS.ACTIVE)
    .map((provider) => provider.id);
  state.selectedProviders = (prefs.selectedProviders || defaultProviders).filter((providerId) => {
    const descriptor = getProviderDescriptors().find((provider) => provider.id === providerId);
    return descriptor?.status === PROVIDER_STATUS.ACTIVE;
  });
  state.locationQuery = prefs.locationQuery || DEFAULT_LOCATION_QUERY;
  state.location = prefs.location || null;
}

function applyTheme(themeId) {
  const theme = THEMES.find((entry) => entry.id === themeId) || THEMES[0];
  state.themeId = theme.id;
  Object.entries(theme.colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  updateThemeColorMeta();
  ui.themeLabel.textContent = theme.label;
  saveUiState();
  if (state.forecasts.size) {
    renderAll();
  }
}

function providerStatusSummary(forecasts) {
  const active = forecasts.filter((forecast) => forecast.status === PROVIDER_STATUS.ACTIVE).length;
  const setup = forecasts.filter((forecast) => forecast.status === PROVIDER_STATUS.SETUP_REQUIRED).length;
  return `${active} active, ${setup} setup required, ${forecasts.length} total listed`;
}

function renderProviderToggles() {
  const providers = getProviderDescriptors();
  ui.providerToggles.replaceChildren();

  for (const provider of providers) {
    const forecast = state.forecasts.get(provider.id);
    const providerStatus = forecast?.status || provider.status;
    const node = ui.toggleTemplate.content.firstElementChild.cloneNode(true);
    const label = node.querySelector(".chip-label");
    const status = node.querySelector(".chip-status");
    const isActive = state.selectedProviders.includes(provider.id);
    label.textContent = provider.label;
    status.textContent = isActive
      ? `SELECTED · ${providerStatus.replaceAll("_", " ")}`
      : `HIDDEN · ${providerStatus.replaceAll("_", " ")}`;
    node.classList.toggle("active", isActive);
    node.setAttribute("aria-pressed", isActive ? "true" : "false");
    node.setAttribute("data-active", isActive ? "true" : "false");
    node.setAttribute("data-provider-status", providerStatus);
    node.style.setProperty("--provider-color", provider.color);
    node.addEventListener("click", (event) => {
      event.preventDefault();
      if (state.selectedProviders.includes(provider.id)) {
        state.selectedProviders = state.selectedProviders.filter((id) => id !== provider.id);
      } else {
        state.selectedProviders = [...state.selectedProviders, provider.id];
      }
      saveUiState();
      renderProviderToggles();
      renderAll();
    });
    ui.providerToggles.append(node);
  }
}

function decorateForecasts(forecasts) {
  return forecasts.map((forecast) => ({
    ...forecast,
    selected: state.selectedProviders.includes(forecast.providerId)
  }));
}

function renderAll() {
  const theme = THEMES.find((entry) => entry.id === state.themeId) || THEMES[0];
  const forecasts = decorateForecasts([...state.forecasts.values()]);
  ui.providerSummary.textContent = providerStatusSummary(forecasts);
  ui.locationLabel.textContent = state.location ? state.location.displayName : "No location selected";
  charts.renderCombined(forecasts, state.location, theme);
  charts.renderCards(forecasts, state.location, theme);
}

async function refreshForecasts(force = false) {
  if (!state.location) {
    state.location = await forecastService.resolveLocation(state.locationQuery);
  }

  const providers = PROVIDERS;
  const completed = [];
  setProgress(5, true);

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    try {
      const { payload, fromCache } = await forecastService.loadProvider(provider.id, state.location, force);
      completed.push(payload);
      state.forecasts.set(provider.id, payload);
      ui.cacheLabel.textContent = fromCache ? "Using cached forecasts" : "Live forecasts refreshed";
    } catch (error) {
      state.forecasts.set(provider.id, {
        providerId: provider.id,
        location: state.location,
        fetchedAt: new Date().toISOString(),
        status: PROVIDER_STATUS.PARTIAL_COVERAGE,
        note: error.message,
        hours: createUnifiedTimeline().map((isoTime) => ({
          isoTime,
          tempF: null,
          precipMm: null,
          precipChancePct: null,
          sourceTempUnit: "F",
          sourcePrecipUnit: "mm",
          isForecast: isoTime >= new Date().toISOString(),
          isPastFill: true
        }))
      });
    }
    setProgress(Math.round(((index + 1) / providers.length) * 100), true);
  }

  const disabledStatuses = new Set([
    PROVIDER_STATUS.SETUP_REQUIRED,
    PROVIDER_STATUS.UNSUPPORTED_FOR_LOCATION
  ]);
  const nextSelectedProviders = state.selectedProviders.filter((providerId) => {
    const forecast = state.forecasts.get(providerId);
    return !forecast || !disabledStatuses.has(forecast.status);
  });
  if (nextSelectedProviders.length !== state.selectedProviders.length) {
    state.selectedProviders = nextSelectedProviders;
    saveUiState();
  }

  storage.write("lastRefresh", { at: new Date().toISOString() });
  ui.updatedLabel.textContent = new Date().toLocaleString();
  renderAll();
  setTimeout(() => setProgress(0, false), 220);
  return completed;
}

async function runSearch(force = false) {
  try {
    ui.fetchButton.disabled = true;
    state.locationQuery = ui.locationInput.value.trim() || DEFAULT_LOCATION_QUERY;
    state.location = await forecastService.resolveLocation(state.locationQuery);
    saveUiState();
    await refreshForecasts(force);
    await refreshNowcast(state.location, force);
  } catch (error) {
    ui.locationLabel.textContent = error.message;
    setProgress(0, false);
  } finally {
    ui.fetchButton.disabled = false;
  }
}

function installPullToRefresh() {
  let startY = 0;
  let active = false;
  window.addEventListener("touchstart", (event) => {
    if (window.scrollY === 0) {
      startY = event.touches[0].clientY;
      active = true;
    }
  }, { passive: true });
  window.addEventListener("touchmove", (event) => {
    if (!active) {
      return;
    }
    const delta = event.touches[0].clientY - startY;
    if (delta > 80) {
      active = false;
      runSearch(true);
    }
  }, { passive: true });
  window.addEventListener("touchend", () => {
    active = false;
  });
}

function forceReloadPage() {
  const url = new URL(window.location.href);
  url.searchParams.set("_reload", Date.now().toString());
  window.location.replace(url.toString());
}

async function bootstrap() {
  loadUiState();
  ui.versionLabel.textContent = APP_VERSION;
  ui.locationInput.value = state.locationQuery;
  if (STATIC_PAGES_MODE) {
    ui.cacheLabel.textContent = "GitHub Pages static PWA mode";
  }
  await registerServiceWorker();
  renderProviderToggles();
  applyTheme(state.themeId);
  ui.fetchButton.addEventListener("click", () => runSearch(true));
  ui.reloadButton.addEventListener("click", forceReloadPage);
  ui.themeButton.addEventListener("click", () => {
    const currentIndex = THEMES.findIndex((theme) => theme.id === state.themeId);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
    applyTheme(nextTheme.id);
  });
  ui.locationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      ui.fetchButton.click();
    }
  });
  ui.dataModalClose.addEventListener("click", () => ui.dataModal.close());
  ui.recentRainDataButton?.addEventListener("click", () => {
    openNowcastDataModal("Recent Rain (Radar)", "Recent Rain (Radar)", nowcastCharts.recentRainPayload);
  });
  ui.nextHourRainDataButton?.addEventListener("click", () => {
    openNowcastDataModal("Next Hour Rain (Nowcast)", "Next Hour Rain (Nowcast)", nowcastCharts.nextHourRainPayload);
  });
  ui.dataModal.addEventListener("click", (event) => {
    const rect = ui.dataModal.getBoundingClientRect();
    const clickedBackdrop =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (clickedBackdrop) {
      ui.dataModal.close();
    }
  });
  installPullToRefresh();

  const lastRefresh = storage.read("lastRefresh");
  if (lastRefresh?.at) {
    ui.updatedLabel.textContent = new Date(lastRefresh.at).toLocaleString();
  }

  await runSearch(false);
  nowcastService.startAutoRefresh(() => state.location);
}

bootstrap();


