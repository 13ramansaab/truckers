# iOS App Build Guide for iPhone Testing

This guide will help you build and test your Trucker Fuel Tax iOS app on your iPhone using EAS Build without requiring an Apple Developer account.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Expo Go** app installed on your iPhone from the App Store

## Step 1: Verify Project Setup

First, let's ensure your project is properly configured:

```bash
# Navigate to your project directory
cd IOS

# Install dependencies
npm install

# Run Expo doctor to check for issues
npx expo-doctor
```

## Step 2: Configure EAS Build

Your `eas.json` has been updated with the proper internal profile configuration. The key changes include:

- **Internal profile**: Configured for development builds with development client
- **Resource class**: Set to `m-medium` for optimal build performance
- **Build configuration**: Set to `Debug` for development builds

## Step 3: Build the iOS App

Run the following command to build your iOS app:

```bash
# Build for iOS using the internal profile
eas build -p ios --profile internal
```

**Important Notes:**
- This will create a development build that includes native modules
- The build will be available for download via a URL
- You'll need to install it on your iPhone using Expo Go or by sideloading

## Step 4: Install and Test on iPhone

### Option A: Using Expo Go (Limited - Some features may not work)
```bash
# Start the development server
npx expo start

# Scan the QR code with Expo Go app
# Note: Some native modules may not work in Expo Go
```

### Option B: Using Development Build (Recommended)
```bash
# After the EAS build completes, download the .ipa file
# Install it on your iPhone using one of these methods:

# Method 1: Use Expo Go to scan the build URL
# Method 2: Sideload using Xcode (requires macOS)
# Method 3: Use a service like TestFlight (requires Apple Developer account)
```

## Step 5: Run the App Locally

Once you have the development build installed:

```bash
# Start the development server
npx expo start --dev-client

# Your app should now connect to the development server
# You can make changes and see them reflected in real-time
```

## Troubleshooting Common Issues

### 1. Build Fails with Certificate Errors
```bash
# Check your EAS configuration
eas build:configure

# Ensure you're using the internal profile
eas build -p ios --profile internal
```

### 2. App Won't Connect to Development Server
- Ensure your iPhone and development machine are on the same network
- Check firewall settings
- Try using a tunnel connection: `npx expo start --tunnel`

### 3. Native Modules Not Working
- Ensure you're using a development build, not Expo Go
- Check that all native dependencies are properly configured in `app.json`
- Verify the build includes the necessary native code

### 4. Location Permissions Issues
Your app requires location permissions. Ensure these are properly configured in `app.json` (already done).

## Project-Specific Notes

Your Trucker Fuel Tax app includes several native modules that require a development build:

- **expo-location**: For GPS tracking and route calculation
- **expo-camera**: For document scanning
- **expo-file-system**: For file management
- **expo-sqlite**: For local database storage

These modules will **NOT** work in Expo Go and require the development build created by EAS.

## Alternative: Local Development Build

If you prefer to build locally instead of using EAS:

```bash
# Install iOS dependencies
npx expo install

# Run on iOS simulator (requires macOS and Xcode)
npx expo run:ios

# Or run on connected iPhone (requires macOS, Xcode, and device)
npx expo run:ios --device
```

## Next Steps

1. Run the build command: `eas build -p ios --profile internal`
2. Wait for the build to complete (usually 10-20 minutes)
3. Download and install the .ipa file on your iPhone
4. Start the development server: `npx expo start --dev-client`
5. Test your app functionality

## Support

If you encounter issues:
- Check the EAS build logs for specific error messages
- Ensure all dependencies are properly installed
- Verify your `eas.json` and `app.json` configurations
- Consider running `npx expo-doctor` to identify setup issues
