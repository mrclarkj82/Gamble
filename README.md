# Doral Red Rock School Hub

Static Vite + React app for the Doral Red Rock student, teacher, and admin gateway.

## What This Version Does

- Uses Firebase Google Authentication.
- Detects role from the signed-in Google email.
- Verifies the Doral Red Rock school code.
- Creates or updates `users/{uid}` profiles in Firestore.
- Lets admin switch between Admin view and Teacher view.
- Lets teachers create class sections with generated class codes.
- Lets teachers attach pre-built course packages to a section.
- Includes Algebra 1 / Math as the existing generated-problem course.
- Adds an English 1 / Freshman English course shell with course metadata, units, lesson placeholders, and assignment type placeholders.
- Adds an English 1 Source Library for copyright-safe resource metadata, source links, license notes, attribution, approval status, and link-only vs embeddable usage tracking.
- Adds an English 1 Scope & Sequence with full-year pacing, six units, standards tags, lesson placeholders, assignment placeholders, and Source Library resource slots.
- Lets admin manage English 1 source-library records and lets teachers view approved resources or submit needs-review suggestions.
- Lets teachers create actual Math assignments from the pre-built curriculum.
- Generates problem previews and answer keys before assigning work.
- Lets teachers/admin preview the exact student-facing work list and assignment runner for a section without creating student submissions.
- Lets teachers/admin generate demo rosters and test a Math section as a selected demo student.
- Saves demo submissions separately from real student submissions so grades and resubmission flows can be tested safely.
- Lets teachers/admin open a Live Monitor for a selected Math assignment and see roster progress in real time.
- Lets students join sections by class code.
- Lets students open attached curriculum only through joined sections.
- Lets students view the English 1 course shell when enrolled in an English 1 section.
- Lets students start and submit assigned Math work.
- Lets teachers view rosters and remove students from a roster.
- Lets admin view all active sections and attached curriculum.

## What Is Not Built Yet

This version intentionally does not include an advanced curriculum builder, full English readings or worksheets, English annotation tools, English assignment creation, English live monitoring, a full gradebook, Google Classroom sync, device/browser surveillance, Clever sync, Infinite Campus sync, parent accounts, or teacher-created curriculum from scratch. It does include basic generated-problem Math assignments, student submissions, in-app Math assignment progress monitoring, a static English 1 shell, and an English 1 source-library system for future public-domain/free-resource content.

## Accepted Accounts

- Admin: `joseph.clark@doralacademynv.org`
- Students: any email ending in `@student.doralacademynv.org`
- Teachers: any email ending in `@doralacademynv.org`

Admin detection runs first, so `joseph.clark@doralacademynv.org` becomes `admin`, not `teacher`. Inside the dashboard, the admin account can switch between Admin view and Teacher view.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

The production build is created in `dist/`.

## Firebase Config

The Firebase web app config lives in `src/firebase.js` and currently points at project `gamble-714a3`.

Only the Firebase web client config belongs in this file. Do not add service-account keys or Firebase Admin SDK credentials to the frontend.

## Firebase Authentication

In Firebase Console:

1. Open Authentication.
2. Enable Google as a sign-in provider.
3. Add these authorized domains:
   - `localhost`
   - your Firebase Hosting domain
   - any GitHub Pages domain you use for testing

## Required Firestore Documents

Create or seed this school document:

```text
schools/doral-red-rock
```

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

Create or seed this pre-built Math curriculum package if you want the Firestore package mirror:

```text
schools/doral-red-rock/curriculumPackages/math
```

```json
{
  "curriculumId": "math",
  "title": "Math",
  "subject": "Mathematics",
  "description": "Pre-built Math curriculum.",
  "gradeLevel": "General",
  "active": true,
  "isPrebuilt": true,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

Create or seed this English 1 curriculum package if you want the Firestore package mirror:

```text
schools/doral-red-rock/curriculumPackages/english-1
```

```json
{
  "curriculumId": "english-1",
  "courseId": "english-1",
  "title": "English 1",
  "alternateTitle": "Freshman English",
  "subject": "English Language Arts",
  "subjectKey": "english",
  "description": "A freshman English course focused on close reading, literary analysis, informational text, writing, vocabulary, grammar, discussion, and evidence-based responses.",
  "gradeLevel": "Grade 9 / Freshman",
  "active": true,
  "isPrebuilt": true,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

The app also keeps a small code-first registry in `src/services/curriculum.js` so the dropdown works even before a full curriculum management system exists. Version 6.2 stores the English 1 shell and Scope & Sequence as static React data in `src/data/englishCurriculum.js` and `src/data/englishScopeSequence.js`; it does not require Firestore writes.

## English 1 Scope & Sequence

Version 6.2 adds a static English 1 course map. Teachers/admin can open an English 1 section and use the `Scope & Sequence` tab. Admin can also open `Scope & Sequence` from the Available Curriculum card in Admin view.

The scope data includes:

- Course overview, course length, recommended weeks, and course goals.
- Full-year pacing: Unit 1 four weeks, Unit 2 six weeks, Unit 3 six weeks, Unit 4 five weeks, Unit 5 seven weeks, Unit 6 six weeks, plus two flex/review/assessment weeks.
- Six ordered units:
  - Close Reading Foundations.
  - Short Stories and Literary Elements.
  - Informational Text and Rhetoric.
  - Poetry and Figurative Language.
  - Argument Writing and Research.
  - Drama and Shakespeare Foundations.
- Standards strands and lightweight standards tags such as `RL.9-10.1`, `RI.9-10.2`, `W.9-10.1`, `SL.9-10.1`, and `L.9-10.4`.
- Lesson placeholders with objectives, estimated minutes, strands, skill tags, standards tags, teacher notes, and placeholder status.
- Assignment placeholders with type, purpose, suggested points, future rubric/live-monitoring metadata, resubmission support, and source requirements.
- Source Library resource slots that describe allowed license types and whether link-only or embeddable resources can be used.

The Scope & Sequence is a planning blueprint only. It does not add full readings, copyrighted passages, worksheets, annotation tools, English assignment creation, English submissions, or English live monitoring.

## English 1 Source Library

Version 6.1 adds a copyright-safe source-library system for English 1. Managed school records are stored in Firestore:

```text
schools/{schoolId}/sourceLibrary/{sourceId}
```

Source records store metadata only:

```text
sourceId
schoolId
courseId: "english-1"
subject: "english"
title
author
providerName
providerType
resourceType
sourceUrl
canonicalUrl
gradeBand
recommendedGradeLevel
unitFit
skillTags
textType
licenseType
licenseName
licenseUrl
copyrightStatus
publicDomainUS
canLink
canEmbed
canModify
requiresAttribution
attributionText
usageNotes
restrictions
approvalStatus
reviewedByUid
reviewedAt
createdByUid
createdAt
updatedByUid
updatedAt
active
```

The app also includes static seed metadata in `src/data/sourceLibrarySeeds.js` so the library is useful before Firestore records exist. Seed records include:

- Project Gutenberg.
- Library of Congress.
- National Archives / DocsTeach.
- OpenStax Writing Guide with Handbook.
- Purdue OWL as approved link-only guidance.
- Teacher-added resource placeholder.

These seed records do not include full text. They are provider/source guidance only.

Copyright guardrails:

- Do not store full text from copyrighted or link-only resources.
- Unknown-license resources are forced to `needs_review` and cannot be embedded.
- Link-only or free-access-not-republishable resources force `canEmbed: false`.
- Embeddable resources require approval, a public-domain/government-public-domain/open license type, source URL, license details, and attribution when required.
- Purdue OWL-style writing-reference resources should be linked from the original source, not copied into Gamble.

Admin can add, edit, approve, reject, or deactivate source records. Teachers can view approved resources and submit suggested resources marked `needs_review`. Students do not get source-management controls.

## Course Packages

Current package registry:

- `math` / `algebra-1`: Algebra 1 Math with generated problem assignments, grading, demo students, Live Monitor, and submissions.
- `english-1`: English 1 / Freshman English shell with units, placeholder lessons, and future assignment type metadata.

English 1 Version 6.0 does not include copyrighted stories, poems, articles, worksheets, or source-library passages. Full readings and assignments should be added later using public-domain or freely licensed resources.

## Firestore Structure

Sections:

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
  classCodeUpper
  active
  createdAt
  updatedAt
  studentCount
  studentUids
  curriculumId
  courseId
  curriculumTitle
  curriculumSubject
```

Admin Overview computes the displayed `Students` count live from active section
enrollments plus active demo roster entries. The stored `studentCount` field is
kept for real enrollment bookkeeping, but it is not trusted as the only source
when demo/test students exist.

Class code lookup:

```text
schools/{schoolId}/classCodes/{classCode}
  classCode
  classCodeUpper
  sectionId
  schoolId
  active
  teacherUid
  curriculumId
  createdAt
```

Enrollments:

```text
schools/{schoolId}/sections/{sectionId}/enrollments/{studentUid}
  studentUid
  studentName
  studentEmail
  status
  joinedAt
```

User section references:

```text
users/{uid}/sections/{sectionId}
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
  curriculumId
  curriculumTitle
  curriculumSubject
  joinedAt or createdAt
  status or active
```

Assigned work:

```text
schools/{schoolId}/sections/{sectionId}/assignments/{assignmentId}
  assignmentId
  schoolId
  sectionId
  sectionName
  course
  courseName
  period
  subject
  curriculumId
  curriculumTitle
  curriculumSubject
  assignmentType
  title
  directions
  problemCount
  dueDate
  feedbackMode
  maxAttempts
  timeLimitMinutes
  active
  teacherUid
  teacherName
  teacherEmail
  createdAt
  updatedAt
```

Student submissions:

```text
schools/{schoolId}/sections/{sectionId}/assignments/{assignmentId}/submissions/{studentUid}
  assignmentId
  assignmentTitle
  sectionId
  schoolId
  studentUid
  studentName
  studentEmail
  answers
  correctCount
  score
  problemCount
  percent
  gradePercent
  status
  attemptNumber
  maxAttempts
  attempts
  feedback
  resubmissionAllowed
  resubmissionDueDate
  submittedAt
  updatedAt
```

Demo roster entries:

```text
schools/{schoolId}/sections/{sectionId}/demoStudents/{demoStudentId}
  demoStudentId
  firstName
  lastName
  displayName
  email
  schoolId
  sectionId
  status
  isDemo
  createdAt
  createdByUid
  updatedAt
```

Demo submissions:

```text
schools/{schoolId}/sections/{sectionId}/assignments/{assignmentId}/demoSubmissions/{demoStudentId}
  assignmentId
  assignmentTitle
  schoolId
  sectionId
  demoStudentId
  demoStudentName
  demoStudentEmail
  isDemo
  submittedByTeacherUid
  submittedByTeacherEmail
  answers
  score
  gradePercent
  status
  attemptNumber
  maxAttempts
  attempts
  feedback
  resubmissionAllowed
  resubmissionDueDate
  submittedAt
  updatedAt
```

Assignment progress for Live Monitor:

```text
schools/{schoolId}/sections/{sectionId}/assignments/{assignmentId}/progress/{studentKey}
  schoolId
  sectionId
  assignmentId
  studentUid or demoStudentId
  studentName
  studentEmail
  isDemo
  status
  answeredCount
  totalProblems
  progressPercent
  openedAt
  lastActivityAt
  submittedAt
  attemptNumber
  score
  gradePercent
  resubmissionAllowed
  needsResubmission
  updatedAt
```

`studentKey` is the real Firebase Auth UID for real students and the demo
student ID for demo/test students. Student Preview does not write progress.

## Firestore Rules

Rules are in `firestore.rules`.

They allow:

- Users to read and write their own profile.
- Authenticated Doral users to read active school documents.
- School members to read active sections in their school.
- Teachers and admin to create sections for their own account.
- Students to join sections only inside their own school.
- Students to create their own enrollment and user-section reference.
- Teachers to read rosters for sections they own.
- Teachers to remove students from rosters they own.
- Teachers to create assignments for sections they own.
- Students to read assignments only through enrolled sections.
- Students to submit their own assignment work.
- Students to create/update only their own assignment progress documents.
- Teachers/admin to create demo students only for sections they own or administer.
- Teachers/admin to save demo submissions only under `demoSubmissions`, not real student UID paths.
- Teachers/admin to read assignment progress and submissions for sections they own or administer.
- Teachers/admin to create/update demo progress only for sections they own or administer.
- Teachers/admin to review submissions and open resubmission without creating real student submissions.
- Teachers/admin to reset or clear assignment submissions only for sections they own or administer.
- Students cannot delete or clear assignment submission documents.
- Admin to read all sections in the admin school.
- Admin to manage curriculum package documents.
- Admin to create, edit, approve, reject, deactivate, or delete English 1 source-library records for their school.
- Teachers to read approved source-library records and submit their own needs-review resource suggestions.
- Students to read approved source metadata only if a future UI exposes those records.
- Students cannot create, edit, approve, reject, or delete source-library records.

Known limitation: active section metadata is readable by authenticated users in the same school. The class code is still required to enroll, and students cannot assign curriculum or create sections. Source-library records are metadata-only; the rules do not inspect outside web pages, so license review still depends on admin approval and the app's form validation.

Deploy rules:

```bash
npx firebase-tools deploy --only firestore:rules --project gamble-714a3
```

## Deploy Hosting

Build and deploy the static app to Firebase Hosting:

```bash
npm run build
npx firebase-tools deploy --only hosting --project gamble-714a3
```

This project includes `.firebaserc` and `firebase.json` configured for `gamble-714a3`.

## How To Test

Teacher/admin:

1. Sign in as `joseph.clark@doralacademynv.org`.
2. Use the Teacher view tab.
3. Create a section with Course Name `Algebra 1`, Period `2`, Curriculum Package `Algebra 1 (Math)`.
4. Copy the generated class code.
5. Click the section name in Active Sections.
6. Open Curriculum from the selected section tools.
7. Click Assignment Setup to choose a topic, problem count, due date, feedback, attempts, and time limit.
8. Preview generated problems and answers.
9. Click Assign Work To Section.
10. Click Student Preview to see what a demo student sees for that exact section.
11. Open an assignment as Demo Student and use Demo Submit to grade locally without writing a submission.
12. Return to the teacher dashboard, click the section name, open View roster, and generate a demo roster.
13. Click Test as Student for a demo student.
14. Submit assigned work in Teacher Test Mode.
15. Exit test mode, click the section name, open Live Monitor, and select the assignment.
16. Confirm the monitor shows real and demo roster students with Waiting, Started, Working, Submitted, or Graded style statuses.
17. Use Test as Student again, answer problems, and confirm Live Monitor updates progress after refresh or automatically.
18. Exit test mode, then open Grade Assignment on the assignment card.
19. Confirm the Roster table shows Student, Status, Score, Grade, Answered, Submitted, Work, and Reset.
20. Click View Work to see the student's answers, answer key, feedback field, and resubmission controls.
21. Add feedback or click Allow Resubmission.
22. Re-enter as the same demo student and resubmit.
23. Use row Reset for one submission, or Clear All Submissions to clear only the selected assignment.
24. Open the roster and use Remove when a real student needs to be deleted from that roster.

English 1 shell:

1. Sign in as `joseph.clark@doralacademynv.org`.
2. Use Teacher view.
3. Create a section with Course Name `English 1`, Period `3`, Curriculum Package `English 1 (Freshman English)`.
4. Click the section card in Active Sections.
5. Confirm the English 1 shell opens on the `Scope & Sequence` tab.
6. Confirm the full-year pacing guide shows 36 total weeks.
7. Expand each unit and confirm goals, essential questions, focus skills, lesson placeholders, assignment placeholders, resource slots, and standards tags appear.
8. Open `Source Library` and confirm approved resources and link-only labels are visible.
9. Click Student Preview and confirm the student-facing roadmap is simplified and does not show source-management controls, teacher notes, or standards-heavy planning metadata.
10. Confirm no copyrighted reading content appears.
11. Return to an Algebra 1 section and confirm Math assignments, grading, and Live Monitor still open.

Admin Scope & Sequence:

1. Sign in as `joseph.clark@doralacademynv.org`.
2. Use Admin view.
3. In Available Curriculum, click `Scope & Sequence` on English 1.
4. Confirm the English 1 Scope & Sequence opens.
5. Confirm all six units appear in order and can be expanded.
6. Confirm Source Library still opens from the English 1 tabs.

English 1 Source Library:

1. Sign in as `joseph.clark@doralacademynv.org`.
2. Use Admin view.
3. Open the English 1 Source Library area.
4. Confirm seed metadata records appear for Project Gutenberg, Library of Congress, National Archives / DocsTeach, OpenStax, Purdue OWL, and the teacher-added placeholder.
5. Add a resource with `License Type` set to `Unknown Needs Review`.
6. Confirm it saves as `Needs Review` and cannot be embedded.
7. Try to mark an unknown-license resource embeddable and confirm the app blocks or corrects it.
8. Add a link-only writing reference and confirm `canLink` is true and `canEmbed` is false.
9. Add a public-domain/open-license test resource with attribution/license information.
10. Approve it and confirm it appears in approved resources.
11. Sign in as a teacher or use Teacher view, open an English 1 section, and confirm approved resources are visible.
12. Confirm students do not see add/edit/approve controls.

Student:

1. Sign in with an approved `@student.doralacademynv.org` account.
2. Enter school code `DRR2026` if prompted.
3. Join with the teacher's class code.
4. Open the attached curriculum from the joined class card.
5. In a Math section, start assigned work and submit answers.
6. In an English 1 section, confirm the shell says English lessons and assignments will appear when assigned.

Admin:

1. Sign in as `joseph.clark@doralacademynv.org`.
2. Use Admin view.
3. Confirm active sections show teacher, period, class code, student count, and curriculum.
4. Confirm Available Curriculum shows Algebra 1 and English 1.
