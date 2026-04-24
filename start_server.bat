@echo off
setlocal

set "APP_DIR=%~dp0"
set "PORT=3000"
set "SERVER_URL=http://localhost:%PORT%"
set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

echo Looking for an existing server on port %PORT%...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  echo Stopping process %%P...
  taskkill /PID %%P /F >nul 2>&1
)

pushd "%APP_DIR%"
echo Starting SkyDiff2 server...
start "SkyDiff2 Server" cmd /k "cd /d "%APP_DIR%" && node server.js"

echo Waiting for server startup...
timeout /t 2 /nobreak >nul

echo Opening %SERVER_URL% in Chrome...
if exist "%CHROME_EXE%" (
  start "" "%CHROME_EXE%" "%SERVER_URL%"
) else (
  echo Chrome not found. Falling back to default browser.
  start "" "%SERVER_URL%"
)

popd
endlocal
