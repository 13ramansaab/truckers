# IFTA Tracker - Release Instructions

## 🚀 Release Preparation

This document outlines the steps to prepare and test the IFTA Tracker app for TestFlight release.

## 📱 Local Testing

Before building for TestFlight, test locally:

```bash
# Clear cache and start development server
npm run start:clear

# Test on physical device with Expo Go
# Verify no crashes and authentication works
```

## 🏗️ iOS Build for TestFlight

Build iOS version for TestFlight submission:

```bash
# Build iOS with preview profile
eas build -p ios --profile preview

# Submit to TestFlight
eas submit --platform ios --profile production
```

## ✅ Acceptance Criteria

- [ ] No missing native module crashes
- [ ] TestFlight app opens to first screen
- [ ] Authentication flow works (mock Supabase)
- [ ] All navigation screens load properly
- [ ] No Reanimated/RNGH initialization errors

## 🔧 Key Configuration

### Babel Config
- `react-native-reanimated/plugin` is last in plugins array
- Uses `babel-preset-expo` preset

### Dependencies
- `react-native-reanimated@~3.17.4`
- `react-native-gesture-handler@~2.24.0`
- `react-native-screens@~4.11.1`
- `react-native-safe-area-context@5.4.0`
- `react-native-svg@15.11.2`

### App Entry
- `react-native-gesture-handler` imported first
- Path aliases use `~/` prefix
- Mock Supabase client for development

## 🐛 Troubleshooting

If TestFlight crashes:
1. Check Metro logs for native module errors
2. Verify Reanimated plugin is last in Babel config
3. Ensure gesture handler import is first
4. Test with `npm run start:clear` locally

## 📋 Release Checklist

- [ ] Local testing passes
- [ ] iOS build succeeds
- [ ] TestFlight submission successful
- [ ] App opens without crashes
- [ ] Core functionality verified
