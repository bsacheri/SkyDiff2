import http from "node:http";
import https from "node:https";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import {
  APP_VERSION,
  DEFAULT_LOCATION,
  DEFAULT_LOCATION_QUERY,
  PROVIDER_STATUS,
  createUnifiedTimeline,
  emptyForecast,
  normalizeNwsHourly,
  normalizeOpenMeteo,
  normalizeOpenWeather,
  normalizeWeatherApi
} from "./shared/forecast-core.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const execFileAsync = promisify(execFile);
const localConfig = await loadLocalConfig();
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function fetchJson(url, options = {}) {
  try {
    return await fetchJsonViaHttps(url, options);
  } catch (error) {
    const message = error?.message || "";
    if (process.platform === "win32" && /unable to get local issuer certificate/i.test(message)) {
      return fetchJsonViaPowerShell(url, options);
    }
    throw error;
  }
}

async function fetchJsonViaHttps(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const request = https.request({
      protocol: requestUrl.protocol,
      hostname: requestUrl.hostname,
      port: requestUrl.port || 443,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: options.method || "GET",
      headers: options.headers || {}
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        let json = {};
        try {
          json = body ? JSON.parse(body) : {};
        } catch {
          json = { raw: body };
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(`Upstream request failed with ${response.statusCode}`);
          error.statusCode = response.statusCode;
          error.payload = json;
          reject(error);
          return;
        }
        resolve(json);
      });
    });

    request.on("error", (error) => {
      reject(new Error(`Network request failed: ${error.message}`));
    });

    if (options.body) {
      request.write(options.body);
    }
    request.end();
  });
}

async function fetchJsonViaPowerShell(url, options = {}) {
  const headersJson = JSON.stringify(options.headers || {});
  const powershellPath = resolvePowerShellPath();
  const script = `
& {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  $url = $env:SKYDIFF_REQUEST_URL
  $headersJson = $env:SKYDIFF_REQUEST_HEADERS
  $headers = @{}
  if ($headersJson -and $headersJson -ne '{}') {
    $parsedHeaders = ConvertFrom-Json $headersJson
    if ($parsedHeaders) {
      $parsedHeaders.PSObject.Properties | ForEach-Object {
        $headers[$_.Name] = [string]$_.Value
      }
    }
  }
  $response = Invoke-WebRequest -UseBasicParsing -Uri $url -Headers $headers -Method '${options.method || "GET"}'
  [Console]::Out.Write($response.Content)
}
`.trim();
  const { stdout, stderr } = await execFileAsync(powershellPath, [
    "-NoProfile",
    "-Command",
    script
  ], {
    env: {
      ...process.env,
      SKYDIFF_REQUEST_URL: url,
      SKYDIFF_REQUEST_HEADERS: headersJson
    },
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });

  if (stderr?.trim()) {
    throw new Error(`PowerShell request failed: ${stderr.trim()}`);
  }

  try {
    return stdout ? JSON.parse(stdout) : {};
  } catch {
    return { raw: stdout };
  }
}

function resolvePowerShellPath() {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const candidates = [
    process.env.POWERSHELL_PATH,
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    "pwsh.exe",
    "powershell.exe"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.endsWith(".exe")) {
      if (candidate.includes("\\") || candidate.includes("/")) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } else {
        return candidate;
      }
    }
  }

  return "powershell.exe";
}

function getLocationFromSearchParams(searchParams) {
  return {
    displayName: searchParams.get("name") || DEFAULT_LOCATION.displayName,
    lat: Number(searchParams.get("lat") || DEFAULT_LOCATION.lat),
    lon: Number(searchParams.get("lon") || DEFAULT_LOCATION.lon),
    countryCode: searchParams.get("countryCode") || DEFAULT_LOCATION.countryCode,
    postalCode: searchParams.get("postalCode") || DEFAULT_LOCATION.postalCode,
    timezone: searchParams.get("timezone") || DEFAULT_LOCATION.timezone
  };
}

async function resolveLocation(query) {
  if (!query || query === DEFAULT_LOCATION.postalCode) {
    return DEFAULT_LOCATION;
  }

  if (/^\d{5}$/.test(query)) {
    const zipData = await fetchJson(`https://api.zippopotam.us/us/${query}`);
    const place = zipData.places?.[0];
    if (!place) {
      throw new Error("ZIP code not found.");
    }
    return {
      displayName: `${place["place name"]}, ${place["state abbreviation"]} ${query}`,
      lat: Number(place.latitude),
      lon: Number(place.longitude),
      countryCode: zipData["country abbreviation"] || "US",
      postalCode: query,
      timezone: DEFAULT_LOCATION.timezone
    };
  }

  const nominatim = await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "SkyDiff2/1.0 (weather comparison app)"
      }
    }
  );
  const match = nominatim[0];
  if (!match) {
    throw new Error("Location not found.");
  }
  return {
    displayName: match.display_name,
    lat: Number(match.lat),
    lon: Number(match.lon),
    countryCode: "US",
    postalCode: "",
    timezone: DEFAULT_LOCATION.timezone
  };
}

async function handleResolve(reqUrl, res) {
  try {
    const query = reqUrl.searchParams.get("q") || DEFAULT_LOCATION_QUERY;
    const location = await resolveLocation(query);
    sendJson(res, 200, { ok: true, location });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
  }
}

async function handleNws(reqUrl, res) {
  try {
    const timeline = createUnifiedTimeline();
    const location = getLocationFromSearchParams(reqUrl.searchParams);
    if (location.countryCode !== "US") {
      sendJson(res, 200, emptyForecast("nws", location, timeline, PROVIDER_STATUS.UNSUPPORTED_FOR_LOCATION, "NWS supports U.S. locations only."));
      return;
    }
    const point = await fetchJson(`https://api.weather.gov/points/${location.lat},${location.lon}`, {
      headers: { "User-Agent": "SkyDiff2/1.0 (weather comparison app)", Accept: "application/geo+json" }
    });
    const forecastUrl = point?.properties?.forecastHourly;
    const gridUrl = point?.properties?.forecastGridData;
    const hourly = forecastUrl
      ? await fetchJson(forecastUrl, {
        headers: { "User-Agent": "SkyDiff2/1.0 (weather comparison app)", Accept: "application/geo+json" }
      })
      : { properties: { periods: [] } };
    const grid = gridUrl
      ? await fetchJson(gridUrl, {
        headers: { "User-Agent": "SkyDiff2/1.0 (weather comparison app)", Accept: "application/geo+json" }
      })
      : { properties: {} };
    sendJson(res, 200, normalizeNwsHourly({ hourly, grid }, timeline, location));
  } catch (error) {
    sendJson(res, 500, emptyForecast("nws", getLocationFromSearchParams(reqUrl.searchParams), createUnifiedTimeline(), PROVIDER_STATUS.PARTIAL_COVERAGE, error.message));
  }
}

async function handleOpenMeteo(reqUrl, res) {
  try {
    const providerId = reqUrl.searchParams.get("providerId") || "openmeteo_gfs";
    const timeline = createUnifiedTimeline();
    const location = getLocationFromSearchParams(reqUrl.searchParams);
    const endpoint = providerId === "openmeteo_ecmwf"
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
    const payload = await fetchJson(url.toString());
    sendJson(res, 200, normalizeOpenMeteo(payload, timeline, { ...location, timezone: payload.timezone || location.timezone }, providerId));
  } catch (error) {
    sendJson(
      res,
      500,
      emptyForecast(
        reqUrl.searchParams.get("providerId") || "openmeteo_gfs",
        getLocationFromSearchParams(reqUrl.searchParams),
        createUnifiedTimeline(),
        PROVIDER_STATUS.PARTIAL_COVERAGE,
        error.payload?.reason || error.message
      )
    );
  }
}

function requireKey(envName) {
  const key = process.env[envName] || localConfig?.[envName];
  if (!key) {
    const error = new Error(`${envName} is not configured.`);
    error.statusCode = 503;
    throw error;
  }
  return key;
}

async function handleWeatherApi(reqUrl, res) {
  try {
    const key = requireKey("WEATHERAPI_KEY");
    const timeline = createUnifiedTimeline();
    const location = getLocationFromSearchParams(reqUrl.searchParams);
    const url = new URL("https://api.weatherapi.com/v1/forecast.json");
    url.searchParams.set("key", key);
    url.searchParams.set("q", `${location.lat},${location.lon}`);
    url.searchParams.set("days", "4");
    url.searchParams.set("aqi", "no");
    url.searchParams.set("alerts", "no");
    const payload = await fetchJson(url.toString());
    sendJson(res, 200, normalizeWeatherApi(payload, timeline, location));
  } catch (error) {
    sendJson(res, error.statusCode || 500, emptyForecast("weatherapi", getLocationFromSearchParams(reqUrl.searchParams), createUnifiedTimeline(), PROVIDER_STATUS.SETUP_REQUIRED, error.message));
  }
}

async function handleOpenWeather(reqUrl, res) {
  try {
    const key = requireKey("OPENWEATHERMAP_KEY");
    const timeline = createUnifiedTimeline();
    const location = getLocationFromSearchParams(reqUrl.searchParams);
    const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lon));
    url.searchParams.set("exclude", "minutely,daily,alerts,current");
    url.searchParams.set("appid", key);
    url.searchParams.set("units", "metric");
    const payload = await fetchJson(url.toString());
    sendJson(res, 200, normalizeOpenWeather(payload, timeline, location));
  } catch (error) {
    sendJson(res, error.statusCode || 500, emptyForecast("openweather", getLocationFromSearchParams(reqUrl.searchParams), createUnifiedTimeline(), PROVIDER_STATUS.SETUP_REQUIRED, error.message));
  }
}

async function handleStubProvider(reqUrl, res, providerId, note) {
  const timeline = createUnifiedTimeline();
  const location = getLocationFromSearchParams(reqUrl.searchParams);
  sendJson(res, 200, emptyForecast(providerId, location, timeline, PROVIDER_STATUS.SETUP_REQUIRED, note));
}

async function serveStatic(reqPath, res) {
  if (
    reqPath === "/config.js" ||
    reqPath === "/config.example.js" ||
    reqPath === "/config.private.js" ||
    reqPath === "/config.private.example.js"
  ) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const targetPath = reqPath === "/" ? "/index.html" : reqPath;
  const absolutePath = path.join(__dirname, targetPath);
  try {
    const file = await readFile(absolutePath);
    const ext = path.extname(absolutePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (reqUrl.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, version: APP_VERSION });
      return;
    }
    if (reqUrl.pathname === "/api/resolve") {
      await handleResolve(reqUrl, res);
      return;
    }
    if (reqUrl.pathname === "/api/nws") {
      await handleNws(reqUrl, res);
      return;
    }
    if (reqUrl.pathname === "/api/openmeteo") {
      await handleOpenMeteo(reqUrl, res);
      return;
    }
    if (reqUrl.pathname === "/api/weatherapi") {
      await handleWeatherApi(reqUrl, res);
      return;
    }
    if (reqUrl.pathname === "/api/openweather") {
      await handleOpenWeather(reqUrl, res);
      return;
    }
    if (reqUrl.pathname === "/api/forecastpro") {
      await handleStubProvider(reqUrl, res, "forecastpro", "ForecastPro is listed, but its hourly endpoint contract still needs confirmation.");
      return;
    }
    if (reqUrl.pathname === "/api/wxdata") {
      await handleStubProvider(reqUrl, res, "wxdata", "WxData is listed, but precipitation support and field mapping still need confirmation.");
      return;
    }
    if (reqUrl.pathname === "/api/weatherdb") {
      await handleStubProvider(reqUrl, res, "weatherdb", "weatherDB stays visible, but no browser-ready hourly forecast endpoint is configured yet.");
      return;
    }
    await serveStatic(reqUrl.pathname, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`SkyDiff2 listening on http://localhost:${PORT}`);
});

async function loadLocalConfig() {
  const configCandidates = [
    path.join(__dirname, "config.private.js"),
    path.join(__dirname, "config.js")
  ];

  for (const configPath of configCandidates) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const configModule = await import(pathToFileURL(configPath).href);
      return configModule.default ?? configModule;
    } catch (error) {
      try {
        const source = await readFile(configPath, "utf8");
        const sandbox = {
          window: {},
          globalThis: {},
          module: { exports: {} },
          exports: {}
        };
        sandbox.window = sandbox;
        sandbox.globalThis = sandbox;
        vm.runInNewContext(source, sandbox, { filename: path.basename(configPath) });

        return (
          sandbox.CONFIG ||
          sandbox.APP_CONFIG ||
          sandbox.module.exports ||
          sandbox.exports ||
          {}
        );
      } catch (fallbackError) {
        console.warn(`Unable to load ${path.basename(configPath)}: ${fallbackError.message}`);
      }
    }
  }

  return {};
}
