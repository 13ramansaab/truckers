@echo off
echo ========================================
echo Building Android APK - Working Version
echo ========================================
echo.

REM Set environment variables
set ANDROID_HOME=C:\Users\13ram\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Java\jdk-24

echo Setting up environment...
echo ANDROID_HOME: %ANDROID_HOME%
echo JAVA_HOME: %JAVA_HOME%
echo.

REM Clean previous builds
echo Cleaning previous builds...
cd android
call gradlew.bat clean
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Clean failed
    pause
    exit /b 1
)

echo.
echo Building APK with optimized configuration...
echo.

REM Build with specific flags to avoid CMake issues
call gradlew.bat assembleRelease ^
    -PreactNativeArchitectures=arm64-v8a ^
    -Pandroid.enableR8.fullMode=false ^
    -Pandroid.enableD8.desugaring=true ^
    -Pandroid.useAndroidX=true ^
    -Pandroid.enableJetifier=true ^
    -Pexpo.useLegacyPackaging=true ^
    -PnewArchEnabled=false ^
    -PhermesEnabled=true ^
    --stacktrace ^
    --info

REM Check if build succeeded
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ BUILD SUCCESSFUL! 🎉
    echo ========================================
    echo.
    echo 📱 Your APK is ready at:
    echo android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo 📊 APK Details:
    echo - Platform: Android
    echo - Architecture: arm64-v8a
    echo - Build Type: Release
    echo - Size: Check the file size above
    echo.
    echo 🚀 You can now install this APK on your Android device
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Check the error messages above for details.
    echo.
    echo 💡 Troubleshooting tips:
    echo - Make sure Android SDK is properly configured
    echo - Check that all dependencies are installed
    echo - Try running 'gradlew.bat clean' first
    echo.
)

echo.
pause
