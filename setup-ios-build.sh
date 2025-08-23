#!/bin/bash

echo "🚀 Setting up iOS Build Environment for Trucker Fuel Tax App"
echo "=========================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install global dependencies
echo "📦 Installing global dependencies..."
npm install -g expo-cli eas-cli

# Check if installation was successful
if ! command -v expo &> /dev/null; then
    echo "❌ Failed to install expo-cli"
    exit 1
fi

if ! command -v eas &> /dev/null; then
    echo "❌ Failed to install eas-cli"
    exit 1
fi

echo "✅ expo-cli version: $(expo --version)"
echo "✅ eas-cli version: $(eas --version)"

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Run expo doctor
echo "🔍 Running Expo Doctor to check for issues..."
npx expo-doctor

echo ""
echo "🎉 Setup complete! You can now run:"
echo "   eas build -p ios --profile internal"
echo ""
echo "📱 Make sure you have Expo Go installed on your iPhone"
echo "🔗 Your eas.json has been configured for internal builds"
echo ""
echo "Next steps:"
echo "1. Run: eas build -p ios --profile internal"
echo "2. Wait for build to complete (10-20 minutes)"
echo "3. Download and install the .ipa file on your iPhone"
echo "4. Run: npx expo start --dev-client"
echo "5. Test your app!"
