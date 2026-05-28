# Doral Red Rock School Hub - Version 1

Version 1 is a static Vite + React web app for the secure entry gate only. It uses Firebase Authentication for Google sign-in and Firestore for school-code verification and user profile storage.

## What Version 1 Does

- Signs users in with Google through Firebase Authentication.
- Detects role from the signed-in email address.
- Blocks unauthorized email domains before showing the school-code prompt.
- Verifies an active school code from Firestore.
- Creates or updates `users/{uid}` after successful school-code verification.
- Routes students, teachers, and admin users to separate placeholder dashboards.

## What Version 1 Does Not Do Yet

This version does not include curriculum, assignments, house points, class section codes, student schedules, teacher-created pages, roster management, gradebook, parent accounts, Infinite Campus sync, or Clever sync.

## Accepted Accounts

- Admin: `joseph.clark@doralacademynv.org`
- Students: any email ending in `@student.doralacademynv.org`
- Teachers: any email ending in `@doralacademynv.org`

Admin detection runs first, so `joseph.clark@doralacademynv.org` becomes `admin`, not `teacher`.

## Install Dependencies

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

## Build for Static Hosting

```bash
npm run build
```

The production build is created in `dist/`.

## Add Firebase Config

Open [src/firebase.js](src/firebase.js) to review the Firebase web app config for project `gamble-714a3`.

Firebase Console > Project settings > General > Your apps > Web app

Use the web app config only. Do not paste service-account keys into the frontend.

```js
const firebaseConfig = {
  apiKey: "AIzaSyDmQmZHkN7DB9hV0Qj-02hk5Rez5zUAqGE",
  authDomain: "gamble-714a3.firebaseapp.com",
  projectId: "gamble-714a3",
  storageBucket: "gamble-714a3.firebasestorage.app",
  messagingSenderId: "330730321975",
  appId: "1:330730321975:web:32f96492ac78b95bc927b2",
};
```

## Enable Google Authentication

1. Open Firebase Console.
2. Go to Authentication > Sign-in method.
3. Enable Google.
4. Add your support email.
5. In Authentication > Settings > Authorized domains, add each domain you will use for testing, such as:
   - `localhost`
   - your GitHub Pages domain, for example `YOUR_GITHUB_USERNAME.github.io`

## Create the Firestore School Document

Create this document manually in Firestore:

Path:

```text
schools/doral-red-rock
```

Fields:

```json
{
  "name": "Doral Red Rock",
  "schoolCode": "DRR2026",
  "allowedStudentDomain": "@student.doralacademynv.org",
  "allowedTeacherDomain": "@doralacademynv.org",
  "active": true,
  "createdAt": "server timestamp"
}
```

Use Firestore's timestamp type for `createdAt`.

## Firestore Security Rules

This project includes [firestore.rules](firestore.rules). The rules are intentionally basic for Version 1:

- Users must be authenticated.
- Users can read only their own `users/{uid}` document.
- Users can create or update only their own `users/{uid}` document.
- The user profile role must match the authenticated Google email.
- Authenticated users with accepted Doral emails can read active school documents.
- No frontend user can write to `schools/{schoolId}`.

Deploy the rules with the Firebase CLI or paste them into Firebase Console > Firestore Database > Rules.

## GitHub Pages or Static Hosting

This app does not require a custom backend server.

For GitHub Pages, set the Vite base path if deploying under a repository subpath:

```js
// vite.config.js
export default defineConfig({
  base: "/YOUR_REPOSITORY_NAME/",
  plugins: [react()],
});
```

Then build the app:

```bash
npm run build
```

Deploy the `dist/` folder through GitHub Pages, Firebase Hosting, Netlify, Vercel, or another static host.

This repo includes Firebase Hosting config in `firebase.json`. To deploy to Firebase Hosting:

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules
```

## Firestore Data Shape

Schools:

```text
schools/{schoolId}
  name
  schoolCode
  allowedStudentDomain
  allowedTeacherDomain
  active
  createdAt
```

Users:

```text
users/{uid}
  uid
  email
  displayName
  role
  schoolId
  schoolName
  schoolCodeUsed
  createdAt
  lastLogin
```

## Manual Firebase Console Steps

1. Create a Firebase project.
2. Add a Firebase web app and copy its config into [src/firebase.js](src/firebase.js).
3. Enable Google Authentication.
4. Create a Firestore database.
5. Add the `schools/doral-red-rock` document with code `DRR2026`.
6. Add the rules from [firestore.rules](firestore.rules).
7. Add any local or deployed testing domains to Firebase Authentication authorized domains.
