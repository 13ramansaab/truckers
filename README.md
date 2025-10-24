# IFTA Tracker

A professional mobile application for trucking companies and independent truck drivers to track trips, log fuel purchases, and generate IFTA (International Fuel Tax Agreement) compliance reports.

## Overview

IFTA Tracker simplifies the complex process of IFTA tax reporting by automatically tracking GPS-based mileage, logging fuel purchases, and generating quarterly reports with state-by-state breakdowns. Built with React Native and Expo, the app provides a seamless experience on both iOS and Android platforms.

## Features

### Trip Tracking
- **GPS-Based Tracking**: Accurate real-time location tracking during trips
- **Start/Stop Controls**: Simple interface to begin and end trip tracking
- **Mileage Calculation**: Automatic calculation of total miles traveled
- **Background Tracking**: Continues tracking even when app is minimized
- **Configurable Accuracy**: Choose between high accuracy or battery-optimized tracking

### Fuel Management
- **Easy Logging**: Quick fuel entry with gallons/liters, cost, and location
- **Receipt Capture**: Take photos of fuel receipts for record keeping
- **Fuel History**: View and search through all fuel purchases
- **Unit Support**: Switch between US (gallons) and Metric (liters) systems

### IFTA Reporting
- **Quarterly Reports**: Generate Q1, Q2, Q3, and Q4 compliance reports
- **State Breakdown**: Detailed mileage and fuel consumption by state
- **Tax Calculations**: Automatic IFTA tax computation
- **Export Options**: Download reports as CSV or PDF files
- **Historical Access**: Review reports from previous quarters

### Dashboard
- **Current Stats**: Overview of this quarter's miles, fuel costs, and MPG
- **Active Trip Status**: Real-time information about ongoing trips
- **Quick Actions**: Fast access to start trip and add fuel entry features
- **Visual Analytics**: Clear charts and metrics for data insights

### Settings & Preferences
- **Theme Options**: Light, Dark, or System-based theme
- **Unit Preferences**: Toggle between US and Metric measurements
- **GPS Settings**: Adjust location accuracy vs battery optimization
- **Account Management**: Profile settings and sign out

## Technology Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router with tab-based interface
- **Backend**: Supabase (authentication and database)
- **Subscriptions**: RevenueCat for in-app purchases
- **Database**: SQLite for local storage with cloud sync
- **Location**: Expo Location for GPS tracking
- **Icons**: Lucide React Native
- **Language**: TypeScript

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- Supabase account
- RevenueCat account

## Installation

1. Clone the repository:
```bash
git clone https://github.com/13ramansaab/truckers.git
cd truckers
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Running the App

### Development Mode
```bash
npm run dev
```

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Clear Cache
```bash
npm run start:clear
```

## Building for Production

### iOS Build
The app uses EAS Build for production builds. See `BUILD_GUIDE.md` for detailed instructions.

### Android Build
Use the provided batch scripts:
```bash
build-android-working.bat
```

## Project Structure

```
ifta-tracker/
├── app/                          # App screens and routes
│   ├── (authenticated)/          # Protected routes
│   │   └── (tabs)/              # Tab navigation screens
│   │       ├── index.tsx        # Home/Dashboard
│   │       ├── trip.tsx         # Trip tracking
│   │       ├── fuel.tsx         # Fuel logging
│   │       ├── quarter.tsx      # IFTA reports
│   │       └── settings.tsx     # Settings
│   ├── (unauthenticated)/       # Public routes
│   │   └── index.tsx           # Login/Signup
│   └── _layout.tsx              # Root layout
├── components/                   # Reusable components
│   ├── AuthGate.tsx             # Authentication wrapper
│   ├── PaywallGate.tsx          # Subscription check
│   ├── TripTracker.tsx          # Trip tracking UI
│   ├── FuelEntryForm.tsx        # Fuel logging form
│   └── ExportButtons.tsx        # Export functionality
├── utils/                        # Utility functions
│   ├── auth.ts                  # Authentication logic
│   ├── database.ts              # Database operations
│   ├── location.ts              # GPS tracking
│   ├── ifta.ts                  # IFTA calculations
│   ├── subscription.ts          # RevenueCat integration
│   └── exportUtils.ts           # Export to CSV/PDF
├── supabase/                     # Supabase configuration
│   ├── migrations/              # Database migrations
│   └── functions/               # Edge functions
├── assets/                       # Images and icons
└── types/                        # TypeScript definitions
```

## Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/`
3. Configure authentication providers
4. Update environment variables with your Supabase credentials

### RevenueCat Setup
1. Create a RevenueCat account
2. Configure iOS and Android products
3. Set up the monthly subscription product
4. Update `revenuecat-config.ts` with your API keys
5. See `REVENUECAT_SETUP.md` for detailed instructions

## Permissions

### iOS
- Location (When In Use and Always): For trip tracking
- Camera: For receipt scanning
- Photo Library: For saving receipts

### Android
- ACCESS_FINE_LOCATION: Precise location tracking
- ACCESS_COARSE_LOCATION: Approximate location
- CAMERA: Receipt capture
- READ/WRITE_EXTERNAL_STORAGE: Receipt storage
- INTERNET: API communication

## Subscription Model

The app offers two tiers to meet different user needs:

### FREE Tier
- Manual trip logging (no GPS tracking)
- Manual fuel entry (up to 10 entries per quarter)
- View current quarter stats only
- Basic dashboard with limited analytics
- No report generation (can only view raw data)

### PREMIUM Tier ($9.99/month)
- **3-day free trial** for new subscribers
- GPS-based automatic trip tracking
- Background tracking
- Unlimited fuel entries with receipt capture
- Full quarterly IFTA report generation
- PDF/CSV export
- Historical report access (all previous quarters)
- Advanced analytics and charts
- Cloud backup and sync
- Priority support
- **Restore Purchases**: Supports subscription restoration across devices

## Testing

The app includes comprehensive test coverage:
- Functional tests for authentication, trip tracking, and fuel logging
- Integration tests for IFTA report generation
- Performance tests for GPS accuracy and battery usage

See `testsprite_tests/` directory for test files.

## Documentation

Additional documentation available:
- `IFTA_APP_PRD.md` - Product requirements document
- `BUILD_GUIDE.md` - Detailed build instructions
- `REVENUECAT_SETUP.md` - RevenueCat configuration guide
- `SCREENSHOT_GUIDE.md` - App screenshots and features
- `README_RELEASE.md` - Release notes and version history

## Troubleshooting

### Dependency Issues
If you encounter peer dependency errors:
```bash
npm install --legacy-peer-deps
```

### Build Errors
Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Location Permissions
Ensure location permissions are granted in device settings for proper trip tracking.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support and questions, please contact the development team.

## Version History

- **v1.5.0** - Current version with auth-first flow and subscription integration
- **v1.0.0** - Initial release

## Acknowledgments

- Built with Expo and React Native
- Authentication powered by Supabase
- Subscription management by RevenueCat
- Icons from Lucide React Native
