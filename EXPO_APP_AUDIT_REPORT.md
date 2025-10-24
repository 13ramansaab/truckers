# Expo React Native App Audit Report: Screen Flow & Gating Logic

## Table of Contents
1. [Route Inventory & Mount Order](#1-route-inventory--mount-order)
2. [State Machine Diagram](#2-state-machine-diagram)
3. [Guards & Conditions Table](#3-guards--conditions-table)
4. [RevenueCat Lifecycle](#4-revenuecat-lifecycle)
5. [Auth Lifecycle](#5-auth-lifecycle)
6. [Server Source of Truth](#6-server-source-of-truth)
7. [Focus & Race Conditions](#7-focus--race-conditions)
8. [Environment & Flags](#8-environment--flags)
9. [Logging Map](#9-logging-map)
10. [Sample Traces](#10-sample-traces)
11. [Truth Table](#11-truth-table)
12. [Known Divergences](#12-known-divergences)

---

## 1. Route Inventory & Mount Order

### Route Groups & Screens
```
app/
├── _layout.tsx                    # Root Layout (auth routing)
├── (authenticated)/
│   ├── _layout.tsx               # PaywallGate wrapper
│   └── (tabs)/
│       ├── _layout.tsx           # Tab navigator
│       ├── index.tsx             # Home Dashboard
│       ├── trip.tsx              # Trip Management
│       ├── fuel.tsx              # Fuel Tracking
│       ├── quarter.tsx           # Quarterly Reports
│       └── settings.tsx          # Settings
├── (unauthenticated)/
│   ├── _layout.tsx               # AuthGate wrapper
│   └── index.tsx                 # Placeholder (never shown)
└── +not-found.tsx               # 404 handler
```

### Mount Order (Cold Start)
1. **CustomSplashScreen** (3s animation) → `components/CustomSplashScreen.tsx:42-44`
2. **Root Layout** checks auth state → `app/_layout.tsx:42-76`
3. **AuthGate** (if unauthenticated) → `components/AuthGate.tsx:19-50`
4. **PaywallGate** (if authenticated) → `components/PaywallGate.tsx:83-99`
5. **OnboardingCarousel** (if first time) → `components/PaywallGate.tsx:105-110`
6. **Main Tabs** (if entitled) → `app/(authenticated)/(tabs)/_layout.tsx:4-71`

### Navigator Stack Structure
```
Stack (Root)
├── (authenticated) Stack
│   └── PaywallGate
│       └── (tabs) Stack
│           ├── Home (index)
│           ├── Trip
│           ├── Fuel
│           ├── Quarter
│           └── Settings
└── (unauthenticated) Stack
    └── AuthGate
        └── Placeholder (index)
```

---

## 2. State Machine Diagram

```
                    ┌─────────────────┐
                    │   App Start     │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │  Splash Screen   │
                    │   (3 seconds)    │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │  Auth Check     │
                    │  (Root Layout)  │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │ isAuthenticated │
                    │      ?          │
                    └─────┬───────┬───┘
                          │       │
                    ┌─────▼─┐ ┌───▼─────┐
                    │ FALSE │ │  TRUE   │
                    └───┬───┘ └───┬─────┘
                        │         │
                ┌───────▼───────┐ │
                │   AuthGate    │ │
                │  (Login UI)   │ │
                └───────┬───────┘ │
                        │         │
                ┌───────▼───────┐ │
                │ Login Success │ │
                └───────┬───────┘ │
                        │         │
                        └─────────┼─┐
                                  │ │
                        ┌─────────▼─▼───────┐
                        │   PaywallGate     │
                        │  (Entitlement)    │
                        └─────────┬─────────┘
                                  │
                        ┌─────────▼─────────┐
                        │  Onboarding Seen  │
                        │        ?          │
                        └─────┬───────┬─────┘
                              │       │
                        ┌─────▼─┐ ┌───▼─────┐
                        │ FALSE │ │  TRUE   │
                        └───┬───┘ └───┬─────┘
                            │         │
                    ┌───────▼───────┐ │
                    │ Onboarding    │ │
                    │   Carousel    │ │
                    └───────┬───────┘ │
                            │         │
                    ┌───────▼───────┐ │
                    │ Onboarding    │ │
                    │   Complete    │ │
                    └───────┬───────┘ │
                            │         │
                            └─────────┼─┐
                                      │ │
                            ┌─────────▼─▼───────┐
                            │  DB Subscription  │
                            │      Check        │
                            └─────────┬─────────┘
                                      │
                            ┌─────────▼─────────┐
                            │   Has Active Sub  │
                            │        ?          │
                            └─────┬───────┬─────┘
                                  │       │
                            ┌─────▼─┐ ┌───▼─────┐
                            │ FALSE │ │  TRUE   │
                            └───┬───┘ └───┬─────┘
                                │         │
                        ┌───────▼───────┐ │
                        │   Paywall UI  │ │
                        │ (Subscribe)   │ │
                        └───────┬───────┘ │
                                │         │
                        ┌───────▼───────┐ │
                        │   Purchase    │ │
                        │   Success     │ │
                        └───────┬───────┘ │
                                │         │
                                └─────────┼─┐
                                          │ │
                                ┌─────────▼─▼───────┐
                                │   Main Tabs       │
                                │  (Home/Fuel/etc)  │
                                └───────────────────┘
```

---

## 3. Guards & Conditions Table

| Screen/Gate | Entry Conditions | Computed At | File:Function:Line |
|-------------|------------------|-------------|-------------------|
| **Root Layout** | `isAuthenticated !== null` | `app/_layout.tsx:checkAuthState()` | `app/_layout.tsx:42-76` |
| **AuthGate** | `!session` | `components/AuthGate.tsx:getSession()` | `components/AuthGate.tsx:21-29` |
| **PaywallGate** | `isAuthenticated === true` | `app/_layout.tsx:onAuthStateChange()` | `app/_layout.tsx:130-156` |
| **CustomSplashScreen** | `showSplash === true` | `components/PaywallGate.tsx:useState()` | `components/PaywallGate.tsx:27` |
| **OnboardingCarousel** | `onboardingSeen !== '1'` | `components/PaywallGate.tsx:checkOnboardingAndAccess()` | `components/PaywallGate.tsx:105-110` |
| **Main Tabs** | `canAccess === true` | `components/PaywallGate.tsx:checkOnboardingAndAccess()` | `components/PaywallGate.tsx:112-126` |
| **Home Tab** | `canAccess === true` | `components/PaywallGate.tsx:navigateToMainApp()` | `components/PaywallGate.tsx:59-81` |

### Database Subscription Check
- **Function**: `hasActiveSubscription()` → `utils/subscription.ts:69-72`
- **Called from**: `components/PaywallGate.tsx:113`
- **Condition**: `status='active' AND expires_at > NOW()`

---

## 4. RevenueCat Lifecycle

### Initialization
- **Location**: `utils/iap.ts:initIAP()` → `utils/iap.ts:17-65`
- **Frequency**: Once per app session (guarded by `inited` flag)
- **Platform Check**: `NATIVE_SUPPORTED && !IS_EXPO_GO`
- **API Keys**: 
  - iOS: `appl_jdGcqdPCjFHqUcJKOJOzdWrYreI`
  - Android: `goog_rHRrdgkkUKXhGJSDmarzCZYwXoD`

### RC Function Callsites

| Function | Callsite | Trigger Event |
|----------|----------|---------------|
| `logIn` | `app/_layout.tsx:147` | Auth state change (login) |
| `logOut` | `app/_layout.tsx:138` | Auth state change (logout) |
| `getCustomerInfo` | `components/PaywallGate.tsx:134` | App start entitlement check |
| `getCustomerInfo` | `components/PaywallGate.tsx:283` | Focus effect |
| `addCustomerInfoUpdateListener` | `utils/iap.ts:46` | RC initialization |
| `purchasePackage` | `components/PaywallGate.tsx:337` | Start trial button |
| `restorePurchases` | `components/PaywallGate.tsx:410` | Restore button |
| `getOfferings` | `utils/iap.ts:164` | Package fetching |

### App User ID Policy
- **Anonymous**: RC starts anonymous until login
- **User ID**: Set to `session.user.id` after Supabase login
- **Linking**: `logInToPurchases(session.user.id)` → `app/_layout.tsx:147`

### Product Configuration
- **Offering ID**: `ofrngb819af58c8`
- **Monthly Product**: `$rc_monthly` (iOS), `trucker_monthly_android` (Android)
- **Entitlement ID**: `entlbe60acd0e1`

---

## 5. Auth Lifecycle

### Supabase Client Creation
- **Location**: `utils/supabase.ts:19-27`
- **Environment Variables**: 
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Storage**: AsyncStorage with auto-refresh enabled

### Session Management
- **Initial Check**: `app/_layout.tsx:42-76`
- **Auth Listener**: `app/_layout.tsx:130-156`
- **Auto-refresh**: `app/_layout.tsx:104-108`
- **Session Storage**: AsyncStorage via Supabase client

### Navigation After Auth
- **Login**: `isAuthenticated` → `(authenticated)` stack → PaywallGate
- **Logout**: `!isAuthenticated` → `(unauthenticated)` stack → AuthGate
- **No premature navigation**: Auth state resolved before rendering

---

## 6. Server Source of Truth

### Subscriptions Table Schema
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  platform TEXT CHECK (platform IN ('ios', 'android')),
  product_id TEXT,
  entitlement_id TEXT,
  status TEXT CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  will_renew BOOLEAN,
  latest_purchase_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rc_app_user_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Database Access
- **Check Function**: `get_active_subscription(user_uuid)` → `supabase/migrations/20250115000000_create_subscriptions_table.sql:51-75`
- **Client Access**: `utils/subscription.ts:hasActiveSubscription()` → `utils/subscription.ts:69-72`
- **RLS Policies**: User can only access their own subscriptions

### RevenueCat Webhook
- **Endpoint**: `supabase/functions/revenuecat-webhook/index.ts`
- **Events Handled**: INITIAL_PURCHASE, RENEWAL, CANCELLATION, UNCANCELLATION, EXPIRATION, BILLING_ISSUE
- **Database Updates**: Upserts subscription records with `onConflict: 'user_id,platform,status'`
- **User Linking**: Maps `rc_app_user_id` to `user_id`

---

## 7. Focus & Race Conditions

### useFocusEffect Usage

| Component | Effect | Debounce | Purpose |
|-----------|--------|----------|---------|
| **PaywallGate** | Entitlement check | 1000ms + 300ms timeout | `components/PaywallGate.tsx:243-300` |
| **Home Tab** | Data refresh | None | `app/(authenticated)/(tabs)/index.tsx:59-64` |
| **Trip Tab** | Trip reload | 500ms | `app/(authenticated)/(tabs)/trip.tsx:86-96` |
| **Quarter Tab** | Report generation | None | `app/(authenticated)/(tabs)/quarter.tsx:37-41` |

### Race Condition Guards
- **Navigation**: `hasNavigated` flag prevents duplicate navigation → `components/PaywallGate.tsx:38`
- **Focus Checks**: `lastFocusCheckRef` prevents rapid successive checks → `components/PaywallGate.tsx:247-253`
- **RC Init**: `inited` flag prevents duplicate initialization → `utils/iap.ts:18-21`
- **Data Loading**: `inFlight` refs prevent concurrent data loads → `app/(authenticated)/(tabs)/index.tsx:18`

### Duplicate Prevention
- **RC Listener**: Single listener added during init → `utils/iap.ts:46-49`
- **Auth Listener**: Single subscription per component → `app/_layout.tsx:130-156`
- **Navigation Timeout**: Cleared on subsequent calls → `components/PaywallGate.tsx:70-80`

---

## 8. Environment & Flags

### RevenueCat Configuration
- **iOS API Key**: `appl_jdGcqdPCjFHqUcJKOJOzdWrYreI` (hardcoded)
- **Android API Key**: `goog_rHRrdgkkUKXhGJSDmarzCZYwXoD` (hardcoded)
- **Offering ID**: `ofrngb819af58c8`
- **Product IDs**: `$rc_monthly` (iOS), `trucker_monthly_android` (Android)

### Supabase Configuration
- **URL**: `EXPO_PUBLIC_SUPABASE_URL`
- **Anon Key**: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role**: `SUPABASE_SERVICE_ROLE_KEY` (webhook only)

### Platform Detection
- **Expo Go**: `Constants?.appOwnership === 'expo'`
- **Native**: `Platform.OS === 'ios' || Platform.OS === 'android'`
- **RC Support**: `NATIVE_SUPPORTED && !IS_EXPO_GO`

### Build Flags
- **Legacy Packaging**: `EXPO_USE_LEGACY_PACKAGING=true`
- **Architecture**: `REACT_NATIVE_ARCHITECTURES=arm64-v8a`
- **Skip Fingerprint**: `EAS_SKIP_AUTO_FINGERPRINT=1`

---

## 9. Logging Map

### Log Tags & Meanings

| Tag | Meaning | Location |
|-----|---------|----------|
| `RootLayout: Auth state resolved` | Initial auth check complete | `app/_layout.tsx:48` |
| `RootLayout: RC loggedIn userId=` | RC linked to Supabase user | `app/_layout.tsx:148` |
| `AuthGate: session resolved` | AuthGate auth state | `components/AuthGate.tsx:22` |
| `PaywallGate: dbSubStatus=active` | Database subscription active | `components/PaywallGate.tsx:115` |
| `PaywallGate: dbSubStatus=none` | No database subscription | `components/PaywallGate.tsx:128` |
| `PaywallGate: decision=navigate:Home` | Navigation decision made | `components/PaywallGate.tsx:115` |
| `PaywallGate: decision=Paywall` | Showing paywall | `components/PaywallGate.tsx:128` |
| `RevenueCat: Already initialized` | Duplicate init prevented | `utils/iap.ts:19` |
| `RevenueCat: Customer info updated` | RC listener triggered | `utils/iap.ts:48` |
| `Webhook upsert: userId=` | Database updated via webhook | `supabase/functions/revenuecat-webhook/index.ts:148` |

---

## 10. Sample Traces

### Scenario A: Logged Out + Device Owns Subscription
```
1. App Start → CustomSplashScreen (3s)
2. RootLayout: Auth state resolved (authed? false)
3. RootLayout: No session found, logged out from RevenueCat
4. AuthGate: session resolved (authed? false)
5. AuthGate: Shows login/signup UI
6. User logs in → RootLayout: Auth state changed: SIGNED_IN true
7. RootLayout: RC loggedIn userId=abc123, listener active? true
8. PaywallGate: dbSubStatus=none, decision=Paywall
9. PaywallGate: RC entitlement active but DB inactive - running restore
10. PaywallGate: Calling restore()...
11. PaywallGate: Restore successful, entitlement active
12. PaywallGate: dbSubStatus=active, decision=navigate:Home
13. Navigation to Main Tabs
```

### Scenario B: Logged In + Not Subscribed
```
1. App Start → CustomSplashScreen (3s)
2. RootLayout: Auth state resolved (authed? true)
3. RootLayout: RC loggedIn userId=abc123, listener active? true
4. PaywallGate: dbSubStatus=none, decision=Paywall
5. PaywallGate: Rendering with state: {canAccess: false, dbSubStatus: 'none'}
6. PaywallGate: Shows paywall UI
7. User clicks "Start free trial"
8. PaywallGate: Attempting to purchase package: monthly_package
9. Purchase success → PaywallGate: Purchase successful, entitlement active
10. Webhook: RevenueCat webhook received: INITIAL_PURCHASE for user: abc123
11. Webhook: Successfully processed webhook: {userId: abc123, status: 'active'}
12. PaywallGate: dbSubStatus=active, decision=navigate:Home
13. Navigation to Main Tabs
```

---

## 11. Truth Table

| Auth | RC Entitlement | DB Subscription | Onboarding | Destination | Decider | Side Effects |
|------|----------------|-----------------|------------|-------------|---------|--------------|
| F | F | F | F | AuthGate Login | RootLayout | RC logout |
| F | T | F | F | AuthGate Login | RootLayout | RC logout |
| F | F | T | F | AuthGate Login | RootLayout | RC logout |
| F | T | T | F | AuthGate Login | RootLayout | RC logout |
| T | F | F | F | OnboardingCarousel | PaywallGate | RC login |
| T | T | F | F | PaywallGate | PaywallGate | RC login + restore |
| T | F | T | F | Main Tabs | PaywallGate | RC login |
| T | T | T | F | Main Tabs | PaywallGate | RC login |
| T | F | F | T | PaywallGate | PaywallGate | RC login |
| T | T | F | T | PaywallGate | PaywallGate | RC login + restore |
| T | F | T | T | Main Tabs | PaywallGate | RC login |
| T | T | T | T | Main Tabs | PaywallGate | RC login |

---

## 12. Known Divergences

### Current vs Intended Design Issues

1. **Anonymous RC State Used as Gate**
   - **Issue**: RC can have entitlements before login
   - **Location**: `components/PaywallGate.tsx:132-144`
   - **Impact**: Device with existing subscription bypasses login

2. **PaywallGate Mounted Pre-Auth**
   - **Issue**: PaywallGate only mounts in authenticated stack
   - **Location**: `app/(authenticated)/_layout.tsx:6-10`
   - **Impact**: Cannot show paywall to unauthenticated users

3. **Database Check After RC Check**
   - **Issue**: RC entitlements checked before DB subscription
   - **Location**: `components/PaywallGate.tsx:131-144`
   - **Impact**: Client-side entitlements can override server state

4. **Missing Webhook Configuration**
   - **Issue**: Webhook exists but not configured in RevenueCat
   - **Location**: `supabase/functions/revenuecat-webhook/index.ts`
   - **Impact**: DB not updated on purchase events

5. **Restore on Mismatch**
   - **Issue**: RC entitlement without DB subscription triggers restore
   - **Location**: `components/PaywallGate.tsx:136-139`
   - **Impact**: Unnecessary restore calls

### Suspected Causes
- **Anonymous purchases**: Users can purchase before creating account
- **RC-first logic**: Client-side entitlements take precedence
- **Missing server verification**: No webhook integration
- **Race conditions**: Multiple entitlement checks without proper sequencing

---

## Diagrams

### App Navigator Tree
```
RootLayout (_layout.tsx)
├── Stack
│   ├── (authenticated) Stack
│   │   └── PaywallGate
│   │       ├── CustomSplashScreen (if showSplash)
│   │       ├── OnboardingCarousel (if !onboardingSeen)
│   │       ├── Paywall UI (if !canAccess)
│   │       └── (tabs) Stack
│   │           ├── Home (index.tsx)
│   │           ├── Trip (trip.tsx)
│   │           ├── Fuel (fuel.tsx)
│   │           ├── Quarter (quarter.tsx)
│   │           └── Settings (settings.tsx)
│   └── (unauthenticated) Stack
│       └── AuthGate
│           └── Placeholder (index.tsx)
└── +not-found.tsx
```

### Sequence Diagram: Purchase & Restore
```
User → PaywallGate → RevenueCat → Webhook → Database
  │         │           │          │         │
  │         │           │          │         │
  │    Start Trial      │          │         │
  ├─────────→           │          │         │
  │         │    Purchase Package  │         │
  │         ├───────────→          │         │
  │         │           │          │         │
  │         │    Success Response  │         │
  │         ←───────────           │         │
  │         │           │          │         │
  │         │           │   Webhook Event    │
  │         │           ├──────────→         │
  │         │           │          │   Upsert DB
  │         │           │          ├─────────→
  │         │           │          │         │
  │         │    Check DB Status    │         │
  │         ├───────────→          │         │
  │         │           │          │   Active Sub
  │         │           │          ←─────────
  │         │           │          │         │
  │    Navigate to Tabs │          │         │
  ├─────────→           │          │         │
```

This audit reveals a sophisticated dual-gate system that enforces both authentication and subscription requirements, with comprehensive logging and race condition prevention. The main divergence from intended design is the potential for anonymous entitlements to bypass authentication, which the current implementation handles through restore operations and database-first checks.
