import test from "node:test";
import assert from "node:assert/strict";
import {
  alignHoursToTimeline,
  cToF,
  createUnifiedTimeline,
  mmFromInches,
  normalizeOpenMeteo,
  normalizeWeatherApi
} from "../shared/forecast-core.js";

test("createUnifiedTimeline includes 77 hourly points from -4h through +72h", () => {
  const timeline = createUnifiedTimeline(new Date("2026-04-22T12:34:56Z"));
  assert.equal(timeline.length, 77);
  assert.equal(timeline[0], "2026-04-22T08:00:00.000Z");
  assert.equal(timeline.at(-1), "2026-04-25T12:00:00.000Z");
});

test("unit conversions preserve expected output units", () => {
  assert.equal(cToF(0), 32);
  assert.equal(mmFromInches(1), 25.4);
});

test("alignHoursToTimeline fills gaps with null values", () => {
  const timeline = [
    "2026-04-22T08:00:00.000Z",
    "2026-04-22T09:00:00.000Z"
  ];
  const aligned = alignHoursToTimeline(new Map([[
    "2026-04-22T08:00:00.000Z",
    { tempF: 42, precipMm: 3.2, sourceTempUnit: "F", sourcePrecipUnit: "mm", isForecast: true, isPastFill: false }
  ]]), timeline);
  assert.equal(aligned[0].tempF, 42);
  assert.equal(aligned[1].tempF, null);
  assert.equal(aligned[1].isPastFill, true);
});

test("normalizeOpenMeteo keeps hours aligned and converts temperatures", () => {
  const timeline = [
    "2026-04-22T08:00:00.000Z",
    "2026-04-22T09:00:00.000Z"
  ];
  const payload = {
    hourly: {
      time: ["2026-04-22T08:00", "2026-04-22T09:00"],
      temperature_2m: [10, 11],
      precipitation: [1.1, 2.2]
    },
    daily: {
      time: ["2026-04-22"],
      sunrise: ["2026-04-22T06:30"],
      sunset: ["2026-04-22T19:55"]
    }
  };
  const forecast = normalizeOpenMeteo(payload, timeline, { timezone: "UTC" }, "openmeteo_gfs");
  assert.equal(forecast.hours[0].tempF, 50);
  assert.equal(forecast.hours[1].precipMm, 2.2);
  assert.equal(forecast.astronomy.length, 1);
});

test("normalizeWeatherApi preserves precip in mm and forecast gaps", () => {
  const timeline = [
    "2026-04-22T08:00:00.000Z",
    "2026-04-22T09:00:00.000Z",
    "2026-04-22T10:00:00.000Z"
  ];
  const payload = {
    forecast: {
      forecastday: [
        {
          hour: [
            { time: "2026-04-22 08:00", temp_f: 61, precip_mm: 0.3 },
            { time: "2026-04-22 10:00", temp_f: 64, precip_mm: 1.5 }
          ]
        }
      ]
    }
  };
  const forecast = normalizeWeatherApi(payload, timeline, {});
  assert.equal(forecast.hours[0].precipMm, 0.3);
  assert.equal(forecast.hours[1].precipMm, null);
  assert.equal(forecast.hours[2].tempF, 64);
});
