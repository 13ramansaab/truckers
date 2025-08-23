# 📱 App Store Screenshot Guide

## 🎯 Screenshots Needed for App Store Listing

Your IFTA Tracker app has **5 main screens** that need screenshots for the app store listing. Here's what to capture:

### 📋 **Screen 1: Home Dashboard**
**File**: `app/(tabs)/index.tsx`
**Purpose**: Main dashboard showing trip status, fuel stats, and quarterly overview
**Key Elements to Show**:
- App title "IFTA Tracker"
- Current quarter and year (Q1 2025)
- Trip tracker status
- Total miles, fuel cost, gallons, and MPG statistics
- Quick action buttons

### 🚛 **Screen 2: Trip Management**
**File**: `app/(tabs)/trip.tsx`
**Purpose**: Trip tracking, start/stop trips, view trip history
**Key Elements to Show**:
- Trip tracker component
- Active trip status
- Trip history list
- Start/stop trip buttons
- Trip details (miles, duration, start time)

### ⛽ **Screen 3: Fuel Management**
**File**: `app/(tabs)/fuel.tsx`
**Purpose**: Add fuel entries, track fuel purchases, calculate fuel tax
**Key Elements to Show**:
- Fuel entry form
- Fuel purchase history
- Fuel tax calculations
- Gallons, cost per gallon, total cost
- Date and location tracking

### 📊 **Screen 4: Quarterly Reports**
**File**: `app/(tabs)/quarter.tsx`
**Purpose**: Quarterly IFTA reports, mileage summaries, tax calculations
**Key Elements to Show**:
- Quarterly summary
- State-by-state mileage breakdown
- Fuel tax calculations
- Report generation options
- Export functionality

### ⚙️ **Screen 5: Settings**
**File**: `app/(tabs)/settings.tsx`
**Purpose**: App configuration, user preferences, data management
**Key Elements to Show**:
- User profile settings
- App preferences
- Data backup/restore options
- About information
- Support and help

## 📸 **Screenshot Requirements**

### **App Store Specifications**
- **iPhone Screenshots**: 6.7" (iPhone 14 Pro Max) - 1290 x 2796 pixels
- **iPad Screenshots**: 12.9" iPad Pro - 2048 x 2732 pixels
- **Format**: PNG or JPEG
- **Quality**: High resolution, clear text

### **Recommended Screenshot Order**
1. **Home Dashboard** - Shows main app functionality
2. **Trip Management** - Core trip tracking feature
3. **Fuel Management** - Fuel tax calculation feature
4. **Quarterly Reports** - IFTA reporting feature
5. **Settings** - App configuration and support

## 🎨 **Screenshot Tips**

### **Content Guidelines**
- **Show Real Data**: Use sample data that looks realistic
- **Highlight Features**: Ensure key functionality is visible
- **Clean Interface**: Remove any development/test elements
- **Consistent State**: All screens should show the same sample data

### **Visual Guidelines**
- **Good Lighting**: Ensure text and UI elements are clearly visible
- **No Personal Info**: Remove any real user data or personal information
- **Professional Look**: Show the app in its best state
- **Feature Focus**: Each screenshot should highlight a specific feature

## 🚀 **How to Take Screhots**

### **Option 1: iOS Simulator (Recommended)**
1. Run `npx expo start`
2. Press `i` to open iOS simulator
3. Navigate to each screen
4. Use Cmd+S to take screenshots
5. Screenshots save to Desktop

### **Option 2: Physical Device**
1. Install development build on iPhone
2. Navigate to each screen
3. Use device screenshot (Power + Volume Up)
4. Transfer screenshots to computer

### **Option 3: Expo Go (Limited)**
1. Install Expo Go on iPhone
2. Scan QR code from development server
3. Navigate through screens
4. Take device screenshots

## 📱 **Sample Data to Use**

### **Trip Data**
- **Active Trip**: "Current Trip" - 150 miles, 2 hours 30 minutes
- **Completed Trips**: 3-4 sample trips with realistic mileage

### **Fuel Data**
- **Fuel Entries**: 5-6 entries with realistic prices ($3.50-$4.20/gallon)
- **Total Gallons**: 150-200 gallons
- **Total Cost**: $600-$800

### **Quarterly Data**
- **Current Quarter**: Q1 2025
- **Total Miles**: 2,500-3,000 miles
- **States**: CA, NV, AZ, TX (realistic trucking routes)

## 🎯 **App Store Listing Content**

### **App Name**
"IFTA Tracker"

### **Subtitle**
"Professional IFTA fuel tax tracking and reporting for truckers"

### **Description Keywords**
- IFTA fuel tax
- Trucking mileage tracking
- Fuel purchase logging
- Quarterly tax reports
- Professional trucker tools

### **Feature Highlights**
1. **Real-time Trip Tracking** - GPS-based mileage tracking
2. **Fuel Tax Calculations** - Automatic IFTA tax computations
3. **Quarterly Reports** - Professional IFTA reporting
4. **Multi-state Support** - Track mileage across all states
5. **Data Export** - Export reports for tax filing

## 📋 **Next Steps**

1. **Take Screenshots** of all 5 main screens
2. **Review Screenshots** for quality and content
3. **Build APK** for Android testing
4. **Prepare App Store Listing** with screenshots and description
5. **Submit for Review** with complete listing materials

Your app has a professional design and comprehensive features that will make for excellent app store screenshots! 🚛✨
