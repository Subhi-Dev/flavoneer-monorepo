# Flavoneer store submission

As of 2026-10-11, for version 0.1.0 of the mobile app in `rd/mobile`. This file has the answers to paste into
App Store Connect and Google Play Console. The images are in `exports/app-store/` and are described in
[BRAND_GUIDE.md](BRAND_GUIDE.md#app-store-and-google-play).

The answers describe what the build does today: email and password sign-in, hourly inspection records, carton
label photos, readings against specification, compliance checks, Arabic and English, light and dark appearance,
Bugsink crash reports, and Microsoft Clarity analytics. If a release adds a feature or SDK, update the matching
form before submitting it. Items marked **Action** need a person to do something before submission.

## App facts

| Item | Value |
| --- | --- |
| App name | Flavoneer |
| iOS bundle ID | `com.flavoneer.mobile` |
| Android package | `com.flavoneer.mobile` |
| Version | 0.1.0 (build number set remotely by EAS, `autoIncrement` in `eas.json`) |
| Devices | iPhone only on iOS (tablet support is off). Phones on Android |
| Orientation | Portrait |
| Languages | English (primary), Arabic |
| Price | Free, no in-app purchases, no ads |
| Account model | Accounts are created by a workspace administrator. The app has no sign-up screen |
| Privacy policy URL | https://flavoneer.com/privacy |
| Account deletion URL | https://flavoneer.com/delete-account |
| Marketing URL | https://flavoneer.com |
| Support URL | https://flavoneer.com/privacy#contact (see the **Action** below) |
| Contact email | RaniaD@flavoneer.com |
| Copyright | 2026 Flavoneer |

Apple requires the support URL to lead to a way of contacting you. The home page has no contact details, so
the table points at the contact section of the privacy page. A dedicated `/support` page would be a better
long-term target.

## Listing copy

Character counts were checked against each store's limit. The Arabic copy needs a review by a native speaker
before submission.

### English

| Field | Store | Limit | Copy |
| --- | --- | --- | --- |
| Name / title | Both | 30 | Flavoneer |
| Subtitle | App Store | 30 | Hourly QC for food production |
| Short description | Google Play | 80 | Hourly production-line inspections, batch label photos, and QC checks. |
| Promotional text | App Store | 170 | Record each production hour on your phone. Photograph the carton label, enter readings against spec, tick the compliance checks, and submit for review. |
| Keywords | App Store | 100 | food,quality,QC,inspection,checklist,batch,production,factory,compliance,audit,label,food safety |
| What's new | Both | 4000 | First release. Hourly line inspections, carton label photos, readings checked against specification, compliance checks, and a full Arabic interface. |

**Description** (App Store description and Google Play full description, limit 4000):

```text
Flavoneer is the production-line quality app for food manufacturers that use the Flavoneer workspace. Line inspectors record each hour of production on their phone, and supervisors review the records in the same workspace.

HOURLY INSPECTIONS
• Open the current hour for your production hall and line, pick the product, and create a draft.
• Every record gets a form serial so you can trace it later.
• See recent records and their status: draft, pending review, approved, or returned.

CARTON LABEL EVIDENCE
• Photograph the printed batch label with the camera.
• Type the printed batch code and confirm that it matches the photo.

READINGS AGAINST SPECIFICATION
• Enter each required measurement, such as pour weight, coated-piece weight, chocolate temperature, and carton weight.
• The app checks every value against the published product specification and marks values outside the range.
• Each reading saves when you leave the field.

COMPLIANCE CHECKS
• 22 checks covering product and packaging, materials and people, environment and safety, and maintenance.
• Submit the record for review when everything is complete. Submitting locks the form.

BUILT FOR THE FACTORY FLOOR
• Full Arabic and English interface, with right-to-left layout in Arabic.
• Light, dark, or system appearance.
• The same account and workspace as the Flavoneer web lab.

You need a Flavoneer account from your organization to sign in. Your workspace administrator creates accounts. The app has no public sign-up. To learn more, visit flavoneer.com.
```

### Arabic

| Field | Store | Limit | Copy |
| --- | --- | --- | --- |
| Name / title | Both | 30 | Flavoneer |
| Subtitle | App Store | 30 | مراقبة جودة الإنتاج الغذائي |
| Short description | Google Play | 80 | فحوصات خط الإنتاج كل ساعة، وصور بطاقات الدفعات، وفحوصات المطابقة. |
| Promotional text | App Store | 170 | سجّل كل ساعة إنتاج من هاتفك. صوّر بطاقة الكرتونة، وأدخل القراءات مقارنة بالمواصفة، وأكمل فحوصات المطابقة، ثم أرسل السجل للمراجعة. |
| Keywords | App Store | 100 | جودة,فحص,مراقبة الجودة,إنتاج,مصنع,دفعة,أغذية,سلامة الغذاء,تدقيق,قائمة تحقق,ملصق |
| What's new | Both | 4000 | الإصدار الأول. فحوصات خط الإنتاج كل ساعة، وصور بطاقات الكرتون، ومقارنة القراءات بالمواصفة، وفحوصات المطابقة، وواجهة عربية كاملة. |

**Description:**

```text
Flavoneer هو تطبيق جودة خطوط الإنتاج لمصنعي الأغذية الذين يستخدمون مساحة عمل Flavoneer. يسجّل مفتشو الخط كل ساعة إنتاج من هواتفهم، ويراجع المشرفون السجلات في مساحة العمل نفسها.

الفحوصات الساعية
• افتح الساعة الحالية لصالة الإنتاج والخط، واختر المنتج، وأنشئ مسودة.
• يحصل كل سجل على رقم تسلسلي لتتبعه لاحقًا.
• اطّلع على السجلات الأخيرة وحالتها: مسودة، أو قيد المراجعة، أو معتمد، أو معاد.

دليل بطاقة الكرتونة
• صوّر بطاقة الدفعة المطبوعة بالكاميرا.
• اكتب رمز الدفعة المطبوع وأكّد أنه يطابق الصورة.

القراءات مقارنة بالمواصفة
• أدخل كل قياس مطلوب، مثل وزن الصب، ووزن الحبة المغلفة، وحرارة الشوكولاتة، ووزن الكرتونة.
• يقارن التطبيق كل قيمة بمواصفة المنتج المنشورة ويميّز القيم الخارجة عن النطاق.
• تُحفظ كل قراءة عند مغادرة الحقل.

فحوصات المطابقة
• 22 فحصًا تشمل المنتج والتغليف، والمواد والأفراد، والبيئة والسلامة، والصيانة.
• أرسل السجل للمراجعة عند اكتمال كل البيانات. يؤدي الإرسال إلى قفل النموذج.

مصمم لأرضية المصنع
• واجهة كاملة بالعربية والإنجليزية، مع تخطيط من اليمين إلى اليسار بالعربية.
• مظهر فاتح أو داكن أو حسب إعداد الجهاز.
• الحساب ومساحة العمل نفسهما في مختبر Flavoneer على الويب.

تحتاج إلى حساب Flavoneer من مؤسستك لتسجيل الدخول. ينشئ مسؤول مساحة العمل الحسابات، ولا يتيح التطبيق التسجيل العام. لمعرفة المزيد، تفضل بزيارة flavoneer.com.
```

## Image uploads

| Store and listing | Upload | File |
| --- | --- | --- |
| App Store, English (U.S.) | iPhone 6.9" screenshots, in order | `exports/app-store/ios/screenshots-6.9in/01` to `05` |
| App Store, Arabic | iPhone 6.9" screenshots, in order | `exports/app-store/ios/screenshots-6.9in-ar/01` to `05` |
| App Store | App icon | Comes from the build (`assets/expo.icon`). `ios/app-icon-1024.png` is the same art for marketing use |
| Google Play, en-US | App icon | `exports/app-store/google-play/icon-512.png` |
| Google Play, en-US | Feature graphic | `exports/app-store/google-play/feature-graphic-1024x500.png` |
| Google Play, en-US | Phone screenshots | `exports/app-store/google-play/phone-screenshots/01` to `05` |
| Google Play, ar | Feature graphic | `exports/app-store/google-play/feature-graphic-ar-1024x500.png` |
| Google Play, ar | Phone screenshots | `exports/app-store/google-play/phone-screenshots-ar/01` to `05` |

Apple scales the 6.9" set down for smaller iPhones, so no other iPhone size is needed. Google Play tablet
screenshots are optional and are not provided. Add the Arabic localization in App Store Connect
(App Information, Localizable Information) and the `ar` translation in Play Console (Store presence, Main store
listing, Manage translations) before uploading the Arabic files.

## App Store Connect

### App information

| Field | Answer |
| --- | --- |
| Primary category | Business |
| Secondary category | Productivity |
| Content rights | No, the app does not contain, show, or access third-party content |
| Age rating | 4+. Answer None or No to every question. The app has no user-to-user messaging, no public user content, no web browsing, no gambling, no mature content, and no contests |
| Made for Kids | No |

### Export compliance

`app.config.ts` sets `ITSAppUsesNonExemptEncryption` to `false`. The app uses only HTTPS and the operating
system's encryption, which is exempt. App Store Connect skips the export compliance questions for these builds.

### App privacy

Answer **Yes, we collect data from this app**. No data type is used for tracking, because nothing is combined
with third-party data for advertising and nothing goes to a data broker.

| Data type | Collected by | Purposes | Linked to user | Tracking |
| --- | --- | --- | --- | --- |
| Contact Info, Name | Account (Convex, Better Auth) | App Functionality | Yes | No |
| Contact Info, Email Address | Account | App Functionality | Yes | No |
| User Content, Photos or Videos | Carton label photos on inspection records | App Functionality | Yes | No |
| User Content, Other User Content | Inspection readings, checks, and records | App Functionality | Yes | No |
| Identifiers, User ID | Account, and Clarity (`setCustomUserId`) | App Functionality, Analytics | Yes | No |
| Usage Data, Product Interaction | Microsoft Clarity screen views and sessions | Analytics | Yes | No |
| Diagnostics, Crash Data | Bugsink (Sentry SDK) | App Functionality | No | No |
| Diagnostics, Other Diagnostic Data | Bugsink error reports with device model, OS, and app version | App Functionality | No | No |

Bugsink is marked as not linked because the app never calls `Sentry.setUser` and `sendDefaultPii` is off.
Clarity is linked because the app sends the signed-in user ID to it.

### App Review information

| Field | Answer |
| --- | --- |
| Sign-in required | Yes |
| User name | **Action.** Create a reviewer account, for example `appreview@flavoneer.com` |
| Password | **Action.** At least 8 characters. Enter it in App Store Connect only, never in this file |
| Contact | Name, phone, and RaniaD@flavoneer.com |

**Action.** The reviewer account must belong to a workspace on the production Convex deployment that has a
timezone set, an initialized hall counter, and at least one published product specification. Without these,
the app shows "Production monitoring needs workspace setup" and the reviewer cannot test anything.

Notes for review:

```text
Flavoneer is a quality control app for food factories. Workspace administrators create accounts, so the app has no sign-up screen. Use the demo account above. It belongs to a sample workspace with a configured production line.

To test:
1. Sign in. The Hourly inspections screen opens.
2. Tap "New inspection", pick a production hall, line, and product, then tap "Create draft".
3. Tap "Capture label" and allow camera access. Photograph any printed text, type a code such as "060826 1", tick the confirmation box, and tap "Confirm batch code".
4. Enter readings. Values outside the specification range show "Outside range".
5. Tick the compliance checks and tap "Submit for review". The record becomes read-only.
6. Settings (tap the avatar) switch the language between English and Arabic and the appearance between light, dark, and system.

The camera is used only to photograph the printed batch label on a carton. The app supports Arabic with a right-to-left layout.
```

### Sign in with Apple and account deletion

Guideline 4.8 does not apply, because the app signs in only with accounts that the customer's organization
creates in Flavoneer. Guideline 5.1.1(v) requires in-app deletion only for apps that let users create accounts.
This app has no sign-up, so the deletion page at https://flavoneer.com/delete-account is enough. If an in-app
sign-up is added later, in-app account deletion becomes mandatory.

## Google Play Console

### Store settings

| Field | Answer |
| --- | --- |
| App or game | App |
| Free or paid | Free |
| Category | Business |
| Tags | Business, Productivity |
| Email | RaniaD@flavoneer.com |
| Website | https://flavoneer.com |

### App content

| Declaration | Answer |
| --- | --- |
| Privacy policy | https://flavoneer.com/privacy |
| Ads | No, the app does not contain ads |
| App access | All or some functionality is restricted. Add the reviewer credentials from the App Store section with the same test steps |
| Content rating | Category: All other app types. Answer No to every question (no violence, sexual content, profanity, controlled substances, gambling, user interaction or content sharing with the public, location sharing, or digital purchases). Expected result: Everyone / PEGI 3 / USK 0 |
| Target audience | 18 and over. The app is a professional tool and the privacy policy says it is not for children under 16 |
| News app | No |
| COVID-19 contact tracing or status | No |
| Data safety | See below |
| Government app | No |
| Financial features | My app doesn't provide any financial features |
| Health apps | My app does not have any health features |
| Advertising ID | No (see the **Action** below) |

**Action.** Before answering No to Advertising ID, open the merged manifest of the release build (EAS build
artifacts or `./gradlew :app:processReleaseMainManifest`) and confirm it has no
`com.google.android.gms.permission.AD_ID` permission. If an SDK adds it, either answer Yes with Analytics as the
purpose or remove it with `tools:node="remove"`.

### Data safety

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes |
| Which account creation methods does your app support? | Other. Accounts are created by the user's organization. (If the form insists on a method, choose Username and password) |
| Do you provide a way for users to request that their data is deleted? | Yes, https://flavoneer.com/delete-account |

Data types. "Shared" is No for every type, because Bugsink, Clarity, and Convex are service providers that
process data for Flavoneer.

| Category, type | Collected | Shared | Optional | Purposes |
| --- | --- | --- | --- | --- |
| Personal info, Name | Yes | No | Required | App functionality, Account management |
| Personal info, Email address | Yes | No | Required | App functionality, Account management |
| Personal info, User IDs | Yes | No | Required | App functionality, Analytics, Account management |
| Photos and videos, Photos | Yes | No | Required | App functionality |
| App activity, App interactions | Yes | No | Required | Analytics |
| App activity, Other user-generated content | Yes | No | Required | App functionality |
| App info and performance, Crash logs | Yes | No | Required | App functionality |
| App info and performance, Diagnostics | Yes | No | Required | App functionality |

None of the data is processed ephemerally. The app does not collect location, contacts, messages, audio,
files, calendar, health, financial data, or web browsing history.

### Release

The production profile in `eas.json` builds an Android App Bundle. Upload the first build by hand in Play
Console (Testing, Internal testing). After that, `eas submit -p android --profile production` works once a
Google service account key is configured for EAS. A new personal developer account must also run a closed test
with at least 12 testers for 14 days before it can apply for production access. Organization accounts do not
have this requirement.

## Blockers to fix before submission

These are mismatches between the build, the privacy policy, and the forms. Either can cause a rejection.

1. **The privacy policy does not mention in-app analytics.** The app runs Microsoft Clarity and sends the
   signed-in user ID, but the "Usage and diagnostics" section of `apps/landing/app/pages/privacy.vue` only
   mentions website analytics and crash reports. Google checks that the Data safety form matches the policy.
   Add Clarity to the policy, including whether it records sessions, and check the masking mode in the Clarity
   project settings so that it hides inspection data and typed values.
2. **The app declares permissions for features it does not have.** `app.config.ts` requests
   `android.permission.RECORD_AUDIO` and configures Face ID, NFC, photo library, and notification plugins.
   No source file uses them. Remove `RECORD_AUDIO` from `android.permissions` and drop the unused plugins, or ship
   the features first. Unused permissions trigger questions in review, and the privacy policy describes
   biometric approvals and NFC reading that the app does not do.
3. **The Arabic copy and screenshot headlines need a native speaker's review.** This covers the Arabic
   listing above, the Arabic headlines in `scripts/screens.mjs`, and the Arabic feature graphic tagline in
   `scripts/templates.mjs`.
4. **The screenshots are mockups.** They use the app's real strings and layout, but compare them with the
   release build on a physical iPhone and Android phone before upload.
