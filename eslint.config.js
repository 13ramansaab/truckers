import pluginReactNative from 'eslint-plugin-react-native';
import globals from 'globals';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-native': pluginReactNative,
    },
    rules: {
      'react-native/no-raw-text': 'error',
      'react-native/no-unused-styles': 'warn',
      'react-native/split-platform-components': 'warn',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      'react-native': {
        version: 'detect',
      },
    },
  },
];