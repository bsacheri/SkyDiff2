Create **SkyDiff2**, a single page web app for comparing hourly weather forecasts from multiple free weather APIs and models, side-by-side and overlaid on a single chart. It helps you visually analyze differences in temperature and precipitation predictions for any location, with a focus on clarity, speed, and customization.

### Features
- Compare free weather APIs/models 
- Unified time axis (from 4 hours ago to 72 hours ahead)
- Combined chart overlays all selected models for direct comparison
- Individual charts for each model
- Precipitation accumulation bars (color-matched to model)
- Smart caching (10-minute TTL, avoids unnecessary API calls)
- 10 color themes (5 dark, 5 light) with instant toggle
- Responsive UI, touch-friendly, pull-to-refresh
- Thin progress bar during API refresh
- Day/night shading and midnight lines
- Version tracking and localStorage persistence
- precipitation is measured in mm
- temperature is mesasured in F

### Using the App
- The page opens to default location for zip code 15108
- Enter a location (city name or ZIP code) and click **Fetch Forecasts**
- Use the toggle buttons to select which models/APIs to display
- View:
  - **Individual charts**: Each model in its own panel
  - **Combined chart**: All selected models overlaid, with legend and precipitation bars
- Change color theme with the palette button (top right)
- Pull down on mobile/touch to refresh all data
- Progress bar at top shows when APIs are being refreshed
- Version and last update info in the footer

### Notes
- Data is cached for 10 minutes per location to reduce API usage
- For Weather APIs that require a free key, prompt me and assist with requesting a key.

### Versioning
- `shared/forecast-core.js`, `package.json`, and `version.json` are intended to stay in sync
- Run `npm run version:bump` to bump the patch version and refresh the shared timestamp metadata
- You can also run `powershell -NoProfile -ExecutionPolicy Bypass -File .\bump-version.ps1 -Part minor` or `-Part major`
- Run `npm run hooks:install` to enable the repo-local Git hook setup
- The installed `pre-commit` hook auto-bumps the patch version and stages the synced files before each commit
- The installed `pre-push` hook validates version metadata before publishing and does not create commits.


### GitHub Pages and PWA Publishing
- SkyDiff2 supports a static GitHub Pages mode at `https://bsacheri.github.io/SkyDiff2/`.
- In static mode, Open-Meteo GFS and ECMWF run directly in the browser.
- Providers that require the local Node API or private API keys remain listed but show setup-required/unavailable states instead of exposing secrets.
- Full-provider development still uses `npm start` and `server.js` locally.
- The PWA manifest and service worker are configured for the `/SkyDiff2/` project path.
- The `pre-push` hook validates version metadata only; it must not create commits during push.
### TODO
- Add a hosted API proxy if full server-backed provider support is required from GitHub Pages.
- Add browser E2E coverage once `@playwright/test` is added to development dependencies.


