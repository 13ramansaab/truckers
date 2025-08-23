# 🚀 Quick Reference: iOS Build Commands

## Essential Commands

```bash
# Navigate to project directory
cd IOS

# Install dependencies
npm install

# Check project health
npx expo-doctor

# Build iOS app (MAIN COMMAND)
eas build -p ios --profile internal

# Start development server (after installing build)
npx expo start --dev-client
```

## Build Process Timeline

1. **Setup** (5 minutes)
   - Run setup script or install dependencies manually
   - Verify with `npx expo-doctor`

2. **Build** (10-20 minutes)
   - Run `eas build -p ios --profile internal`
   - Wait for EAS to complete the build
   - Download the .ipa file

3. **Install** (5 minutes)
   - Install .ipa on your iPhone
   - Use Expo Go or sideload method

4. **Test** (Ongoing)
   - Run `npx expo start --dev-client`
   - Connect your iPhone to the development server

## Troubleshooting Commands

```bash
# Check EAS configuration
eas build:configure

# View build status
eas build:list

# Check project configuration
npx expo config

# Clear cache if needed
npx expo start --clear
```

## Important Notes

- ⚠️ **Expo Go won't work** with your app's native modules
- 📱 **Development build required** for full functionality
- 🔐 **No Apple Developer account needed** for internal builds
- 🌐 **Same network required** for iPhone and development machine

## File Locations

- **Build output**: .ipa file from EAS
- **Configuration**: `eas.json` (updated)
- **App settings**: `app.json` (already configured)
- **Dependencies**: `package.json` (already configured)
