## After this patch
1) Install deps & clear Metro cache:
   npm install
   npx expo start --clear

2) Verify local run works (no "Unable to resolve module" errors).

3) Build an APK in the cloud (Windows-friendly):
   eas login
   eas build -p android --profile preview

Notes:
- If the keystore creation times out, generate one locally with keytool and upload via:
     eas credentials -p android
- Linux/EAS is case-sensitive. Ensure component filenames match imports exactly.
