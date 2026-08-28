@echo off
REM ============================================================
REM Build Script - Bot MAP Pertamina
REM Jalankan di Command Prompt Windows
REM ============================================================

echo.
echo ============================================
echo  Building Bot MAP Pertamina - v2026.05
echo ============================================
echo.

REM Clean previous build (preserve vc_redist.x64.exe and other user files in dist)
if exist "dist\Bot_MAP_Pertamina.exe" del /f /q "dist\Bot_MAP_Pertamina.exe"
if exist "dist\License_Generator_ADMIN.exe" del /f /q "dist\License_Generator_ADMIN.exe"
if exist "build" rmdir /s /q build

REM Deteksi python interpreter yang tersedia (prefer py, fallback python)
set PYTHON_CMD=python
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=py
    echo Menggunakan Python Launcher...
    goto :proceed
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=python
    echo Menggunakan Python dari PATH...
    goto :proceed
)

echo ERROR: Python tidak ditemukan di system PATH!
echo Silakan install Python 3.13 dan centang Add Python to PATH.
pause
exit /b 1

:proceed
REM Install dependencies (jika belum)
%PYTHON_CMD% -m pip install pyinstaller cryptography openpyxl pandas customtkinter playwright opencv-python --break-system-packages -q

REM Install browser
%PYTHON_CMD% -m playwright install chromium --with-deps

REM Build
echo.
echo Building EXE...
echo.
%PYTHON_CMD% -m PyInstaller Bot_MAP_Pertamina.spec --clean

if exist "dist\Bot_MAP_Pertamina.exe" (
    echo.
    echo ============================================
    echo  BUILD BERHASIL!
    echo  File: dist\Bot_MAP_Pertamina.exe
    echo ============================================
    echo.
) else if exist "dist\Bot_MAP_Pertamina\Bot_MAP_Pertamina.exe" (
    echo.
    echo ============================================
    echo  BUILD BERHASIL!
    echo  File: dist\Bot_MAP_Pertamina\Bot_MAP_Pertamina.exe
    echo ============================================
    echo.
) else (
    echo.
    echo BUILD GAGAL - cek error di atas
    echo.
)

pause