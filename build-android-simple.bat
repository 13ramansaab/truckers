@echo off
echo Building Android APK with simplified configuration...

REM Set environment variables
set ANDROID_HOME=C:\Users\13ram\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Java\jdk-24

REM Clean previous builds
cd android
call gradlew.bat clean

REM Build with specific architecture and simplified configuration
call gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a -Pandroid.enableR8.fullMode=false -Pandroid.enableD8.desugaring=true

REM Check if build succeeded
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Build successful! APK created at:
    echo android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo 📱 You can now install this APK on your Android device
) else (
    echo.
    echo ❌ Build failed. Trying alternative approach...
    echo.
    
    REM Try building debug version instead
    call gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a
)

cd ..
pause
