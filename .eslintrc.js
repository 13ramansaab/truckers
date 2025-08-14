module.exports = {
  extends: ['@react-native'],
  plugins: ['react-native'],
  rules: {
    // Disallow raw text outside <Text>
    'react-native/no-raw-text': 'error',
    // Additional React Native specific rules
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
  },
  settings: { 
    'react-native': { 
      version: 'detect' 
    } 
  },
  env: {
    'react-native/react-native': true,
  },
};