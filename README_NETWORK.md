## Yarn fallback (use if npm still fails on EAS)
corepack enable
yarn set version classic
rm -f package-lock.json
yarn install
# commit yarn.lock and remove package-lock.json
git add -A
git commit -m "Switch to Yarn (classic) for EAS reliability"
# push, then rebuild:
eas build -p android --profile preview


Note: EAS auto-detects Yarn if yarn.lock is committed and package-lock.json is absent.
