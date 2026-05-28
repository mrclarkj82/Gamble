# Doral Red Rock School Hub

This is a static Vite + React web app backed by Firebase Authentication and Cloud Firestore.

## Version 1

Version 1 built the secure entry gate:

- Google sign-in with Firebase Authentication.
- Role detection from the signed-in email address.
- School-code verification through Firestore.
- User profile creation/update in `users/{uid}`.
- Placeholder dashboards for students, teachers, and admin.

## Version 2

Version 2 adds class sections and class codes:

- Teachers can create class sections.
- Each section gets a readable class code with a Firestore reservation document to prevent collisions.
- Students can join active sections with class codes.
- Students see joined classes on their dashboard.
- Teachers see their section list and can open rosters.
- Admin can see all active sections for the school.
- Admin can switch between the Admin dashboard and Teacher dashboard tools.

Version 2 still does not include curriculum packages, assignments, house points, Google Classroom sync, live student monitoring, gradebook, teacher approval workflows, parent accounts, Clever, or Infinite Campus integration.

## Accepted Accounts

- Admin: `joseph.clark@doralacademynv.org`
- Students: any email ending in `@student.doralacademynv.org`
- Teachers: any email ending in `@doralacademynv.org`

Admin detection runs first, so `joseph.clark@doralacademynv.org` becomes `admin`, not `teacher`.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite usually serves the app at `http://localhost:5173`.

## Build

```bash
npm run build
```

The static production build is created in `dist/`.

## Deploy to Firebase

This repo includes `.firebaserc` and `firebase.json` for project `gamble-714a3`.

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore
```

`firestore` deploys both `firestore.rules` and `firestore.indexes.json`.

Live hosting URL:

```text
https://gamble-714a3.web.app
```

## Firebase Config

The Firebase web app config is in `src/firebase.js`.

Use only Firebase web app config values in the frontend. Do not paste service-account keys into this project.

## Firebase Console Setup

1. Enable Google Authentication in Firebase Console.
2. Add authorized domains for local and deployed testing:
   - `localhost`
   - `gamble-714a3.web.app`
   - any GitHub Pages domain you choose to use later
3. Create Firestore in native mode.
4. Create the school document below if it does not already exist.
5. Deploy or paste the rules from `firestore.rules`.

## School Document

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

## Teacher Workflow

Teachers sign in, verify the school code, and use **My Class Sections** on the teacher dashboard.

They enter:

- Course Name
- Period

The app generates:

- `sectionName`, for example `Digital Game Development - Period 3`
- `classCode`, for example `CLARK-DGD-P3-7K2Q9`

Creating a section writes:

- `schools/{schoolId}/sections/{sectionId}`
- `users/{teacherUid}/sections/{sectionId}`
- `schools/{schoolId}/classCodes/{classCode}`

The `classCodes` document is a Version 2 helper index used to reserve each generated code.

## Student Workflow

Students sign in, verify the school code, and use **My Classes** on the student dashboard.

They enter a class code. The app normalizes it to uppercase, finds the matching active section in their school, and enrolls them immediately with `status: "active"`.

Joining a class writes:

- `schools/{schoolId}/sections/{sectionId}/enrollments/{studentUid}`
- `users/{studentUid}/sections/{sectionId}`
- increments `studentCount` on the section

Duplicate joins are blocked by checking both the user section reference and the enrollment document.

## Admin Workflow

The admin dashboard shows **School Sections**, a read-only overview of active sections for the admin's `schoolId`.

Admin can see:

- Section name
- Teacher name
- Teacher email
- Course name
- Period
- Class code
- Student count
- Created date

The admin account also has an admin-only dashboard switch for **Admin view** and **Teacher view**. Teacher view lets the admin create personal teacher sections and view rosters using the same section tools teachers use, while the underlying signed-in role remains `admin`.

## Firestore Structure

```text
schools/{schoolId}
  name
  schoolCode
  allowedStudentDomain
  allowedTeacherDomain
  active
  createdAt
```

```text
schools/{schoolId}/sections/{sectionId}
  sectionId
  schoolId
  teacherUid
  teacherName
  teacherEmail
  courseName
  period
  sectionName
  classCode
  active
  createdAt
  updatedAt
  studentCount
```

```text
schools/{schoolId}/sections/{sectionId}/enrollments/{studentUid}
  studentUid
  studentName
  studentEmail
  status
  joinedAt
```

```text
users/{studentUid}/sections/{sectionId}
  sectionId
  schoolId
  courseName
  period
  sectionName
  teacherUid
  teacherName
  teacherEmail
  classCode
  roleInSection
  joinedAt
  status
```

```text
users/{teacherUid}/sections/{sectionId}
  sectionId
  schoolId
  courseName
  period
  sectionName
  teacherUid
  teacherName
  teacherEmail
  classCode
  roleInSection
  createdAt
  active
```

```text
schools/{schoolId}/classCodes/{classCode}
  classCode
  sectionId
  schoolId
  teacherUid
  active
  createdAt
```

## Firestore Rules

The included `firestore.rules` file enforces the Version 1 gate and Version 2 section access:

- Users can read/write only their own top-level user profile.
- Users can read only their own `users/{uid}/sections` documents.
- Teachers and admin can create sections only for their own authenticated UID.
- Teachers can read only sections they own.
- Teachers can read rosters only for sections they own.
- Students can create only their own enrollment documents.
- Students can create only their own user section references.
- Students can increment `studentCount` only as part of an enrollment transaction.
- Admin can read all active sections in their own school.
- Frontend users cannot edit school documents.

Practical Version 2 limitation: students may read active section documents in their own school because Firestore rules must allow the class-code lookup query. The UI only exposes joining by class code.

## Testing

Teacher:

1. Sign in with an email ending in `@doralacademynv.org`.
2. Enter school code `DRR2026`.
3. Create a section from **My Class Sections**.
4. Copy the generated class code.
5. Open the section roster.

Student:

1. Sign in with an email ending in `@student.doralacademynv.org`.
2. Enter school code `DRR2026`.
3. Paste the teacher's class code into **My Classes**.
4. Confirm the class appears and duplicate joins are blocked.

Admin:

1. Sign in as `joseph.clark@doralacademynv.org`.
2. Enter school code `DRR2026`.
3. Confirm active sections appear in **School Sections**.
