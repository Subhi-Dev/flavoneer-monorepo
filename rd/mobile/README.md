# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Over-the-air updates (xprem)

The native app receives JavaScript updates through `expo-updates` from the
self-hosted [xprem](https://xprem.dev) server at `https://ota.synbiodiet.com`.
The Flavoneer app on that server has the App ID
`036ee8e3-ad1e-4f97-ba65-f431ee63767d`. Updates are signed by the server and
verified against `certs/certificate.pem`.

Each native build is bound to a release channel taken from `APP_VARIANT`:
`development`, `preview`, or `production` (the default). The runtime version
uses the `appVersion` policy, so an update only reaches builds with the same
`version` in `app.config.ts`. Bump `version` whenever native code changes.

Server URL, certificate, channel, and runtime version are embedded at build
time. Builds made before this setup polled the Convex Hot Updater endpoint,
which has been removed. They need a new native build to receive updates.

Create the publish token file:

```bash
cp rd/mobile/.env.xprem.example rd/mobile/.env.xprem
```

Set `EOO_TOKEN` to an API key from the Flavoneer app in the
[xprem dashboard](https://ota.synbiodiet.com/dashboard). Without it, `eoas`
falls back to Expo authentication and the server rejects the publish.

Publish from a clean git tree:

```bash
pnpm --filter mobile ota:publish --branch production -m "Describe the change"
```

In the dashboard, the `production` channel must point at the `production`
branch. Use `--rollout-percentage` for a progressive rollout.

New updates download on launch and apply on the next cold start. Updates are
not applied in Expo Go or a development build; use a release build on a
physical device for end-to-end testing. Set `DISABLE_CODE_SIGNING=true` when
a local tool needs the config without the signing certificate.

## Bugsink

The app reports JavaScript and native errors to the Bugsink project at
`zapper.synbiodiet.com`. Performance tracing and session tracking are disabled
because Bugsink only processes error events. Default PII collection is also
disabled.

EAS Build uploads Metro source maps through `sentry-cli`. The non-secret
`SENTRY_PROJECT=flavoneer-web` value is configured in the Expo plugin and in
the linked EAS project. Create this variable in every EAS environment used by a
build profile:

- `SENTRY_AUTH_TOKEN`: a Bugsink API token, stored with sensitive visibility.

The build profiles load the matching `development`, `preview`, or `production`
EAS environment. Run `eas env:create --environment production` once for each
variable and repeat for any other build environment in use. The Bugsink URL,
project slug, and single-organization value are committed in the Expo config;
the auth token must not be committed or prefixed with `EXPO_PUBLIC_`.

The Metro config injects matching debug IDs into bundles and source maps. The
Sentry Expo config plugin adds the native EAS Build upload steps for Android and
iOS. A missing or incorrect `SENTRY_PROJECT` or `SENTRY_AUTH_TOKEN` makes the
upload fail instead of silently producing unsymbolicated errors.

## Record approval with Face ID

Users with the `review_production_checks` permission (Production Manager or Admin) see an "Awaiting review"
list on the Quality screen. Approving or returning a record calls `productionLineRecords.review` only after
`expo-local-authentication` confirms the device owner with Face ID, Touch ID, fingerprint, or the device
passcode. Returning a record requires a review note. Devices with no biometrics and no passcode cannot review.

Test this on a physical phone with a development or release build. Expo Go cannot show the Face ID prompt for
this app, because `NSFaceIDUsageDescription` comes from the native build. To test both paths with one account,
use the Admin role: submit a record, then approve or return it from "Awaiting review".

## Push notifications

The app registers an Expo push token after sign-in, when the user's "app alerts" setting is on (the same
`userSettings.appAlerts` flag the web lab uses; it defaults to on). The permission prompt appears once, after the
first sign-in. The notifications switch in Settings changes that flag and asks for permission again if needed.
Signing out removes the device's token.

The backend (`packages/backend/convex/pushNotifications.ts`) sends through the Expo push service:

- `productionLineRecords.submitForReview` notifies every member who may review records
  (`review_production_checks`, owners, and admins), except the submitter.
- `productionLineRecords.review` notifies the inspector who owns the record that it was approved or returned,
  with the review note.

Messages use the recipient's saved language. Tapping a notification opens the record. Tokens that Expo reports
as `DeviceNotRegistered` are deleted.

One-time setup before a release build:

1. iOS: run `eas credentials -p ios` (or let the first `eas build` do it) and create a push key. EAS uploads the
   APNs key to Expo.
2. Android: create a Firebase project with an Android app for `com.flavoneer.mobile`, download
   `google-services.json`, and store it as a file variable:
   `eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json`.
   `app.config.ts` reads it into `android.googleServicesFile`. Then upload an FCM V1 service account key with
   `eas credentials -p android`. Repeat for the `development` and `preview` environments to test there.
3. Optional: if enhanced push security is turned on for the Expo project, set `EXPO_ACCESS_TOKEN` on the Convex
   deployment (`npx convex env set EXPO_ACCESS_TOKEN ...`).

Push notifications need a development or release build on a physical device. Simulators cannot get a token.

## Production photos

Inspectors can attach up to 10 optional photos from the photo library to a draft or returned record
(`productionLineRecords.attachRecordPhoto` and `removeRecordPhoto`). The app uses the system photo picker, which
needs no photo library permission on Android and none on iOS 14 or later. Photos are resized to 1600 px wide JPEGs
before upload, like the carton label. The carton label itself stays camera-only. Photos lock with the record when
it is submitted for review.

## Store submission

Store icons, feature graphics, and screenshots (English and Arabic) are generated in `design/exports/app-store/`.
The listing copy, App Privacy and Data safety answers, age and content ratings, and App Review notes are in
[`design/STORE_SUBMISSION.md`](../../design/STORE_SUBMISSION.md). Update that file when a release adds a feature,
permission, or SDK that collects data.

The screenshot text comes from `src/locales/en.json` and `ar.json`. After changing a string that appears in a
screenshot, regenerate the images from the repository root:

```sh
node design/scripts/build.mjs app-store
```

## Shared Convex backend

The mobile app uses the same Convex project, generated API, and Better Auth
identity source as the formulation lab. Configure the mobile client with the
matching deployment URLs:

```env
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CONVEX_SITE_URL=
```

The Convex schema and functions live in `packages/backend/convex`. Run the
backend development loop from the repository root:

```sh
pnpm dev:backend
```

The active organization is selected from user settings. The app persists the
matching organization ID in SecureStore and uses it for production queries after the
user returns to the production screen.

The workspace section switcher opens Research & Development at `/` and Quality control at `/quality`. The R&D
section is read-only: it lists the active organization's formulations (`projects.listByOrganization`) and
materials (`ingredients.list`), and `/research/formulations/[projectId]` shows a formulation's figures,
ingredient breakdown, allergens, and lab runs (`projects.get`, `runs.getByProject`). Formulations are created and
edited in the formulation lab, so testing this section needs a workspace with at least one formulation.

Appearance is also a per-user Convex setting shared with the formulation lab.
`ThemePreferenceProvider` supports Light, Dark, and System. System follows the
device color scheme, while an explicit choice updates NativeWind, Expo Router,
and the status bar together.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).