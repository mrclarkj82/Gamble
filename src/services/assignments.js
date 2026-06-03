import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export class AssignmentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AssignmentError";
    this.code = code;
  }
}

function getSchoolId(school) {
  return school?.schoolId || school?.id || "doral-red-rock";
}

function getSectionId(section) {
  return section?.sectionId || section?.id;
}

function readSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function timestampMillis(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  return 0;
}

function sortNewest(items) {
  return [...items].sort(
    (left, right) => timestampMillis(right.createdAt) - timestampMillis(left.createdAt),
  );
}

function assignmentCollection(school, section) {
  return collection(
    db,
    "schools",
    getSchoolId(school),
    "sections",
    getSectionId(section),
    "assignments",
  );
}

function submissionCollection(school, section, assignmentId) {
  return collection(
    db,
    "schools",
    getSchoolId(school),
    "sections",
    getSectionId(section),
    "assignments",
    assignmentId,
    "submissions",
  );
}

function demoSubmissionCollection(school, section, assignmentId) {
  return collection(
    db,
    "schools",
    getSchoolId(school),
    "sections",
    getSectionId(section),
    "assignments",
    assignmentId,
    "demoSubmissions",
  );
}

function progressCollection(school, section, assignmentId) {
  return collection(
    db,
    "schools",
    getSchoolId(school),
    "sections",
    getSectionId(section),
    "assignments",
    assignmentId,
    "progress",
  );
}

function percentFromScore(correctCount, problemCount) {
  return problemCount ? Math.round((correctCount / problemCount) * 100) : 0;
}

function getAttemptNumber(existingSubmission) {
  return (Number(existingSubmission?.attemptNumber) || 0) + 1;
}

function getMaxAttempts(existingSubmission, assignment) {
  return Math.max(
    Number(existingSubmission?.maxAttempts) || 0,
    Number(assignment?.maxAttempts) || 1,
    1,
  );
}

function canSubmitAgain(existingSubmission, assignment) {
  if (!existingSubmission) return true;

  const attemptNumber = Number(existingSubmission.attemptNumber) || 1;
  const maxAttempts = getMaxAttempts(existingSubmission, assignment);

  return existingSubmission.resubmissionAllowed === true || attemptNumber < maxAttempts;
}

function buildAttempt({ answers, correctCount, problemCount, attemptNumber }) {
  const gradePercent = percentFromScore(correctCount, problemCount);

  return {
    attemptNumber,
    answers,
    correctCount,
    gradePercent,
    problemCount,
    score: correctCount,
    submittedAt: new Date().toISOString(),
  };
}

function teacherCanWriteSection({ role, section, user }) {
  return Boolean(
    user && (role === "admin" || (role === "teacher" && section?.teacherUid === user.uid)),
  );
}

function countAnswered(answers = {}) {
  return Object.values(answers).filter((answer) => String(answer || "").trim()).length;
}

function getProgressStudentKey({ isDemo, user }) {
  return isDemo ? user?.demoStudentId : user?.uid;
}

function getProgressStudentName({ isDemo, user }) {
  if (isDemo) return user?.displayName || "Demo Student";
  return user?.displayName || user?.email || "Student";
}

function getProgressStudentEmail({ isDemo, user }) {
  if (isDemo) return user?.email || "";
  return user?.email || "";
}

function getProgressStatusFromAnswers({ answeredCount, totalProblems }) {
  if (answeredCount <= 0) return "started";
  const progressPercent = totalProblems
    ? Math.round((answeredCount / totalProblems) * 100)
    : 0;
  return progressPercent >= 80 ? "nearly_done" : "working";
}

async function writeAssignmentProgress({
  actorUser = null,
  answers = {},
  assignment,
  attemptNumber = null,
  gradePercent = null,
  isDemo = false,
  opened = false,
  needsResubmission = false,
  role,
  resubmissionAllowed = false,
  school,
  score = null,
  section,
  status,
  submitted = false,
  user,
}) {
  const assignmentId = assignment?.assignmentId;
  const studentKey = getProgressStudentKey({ isDemo, user });

  if (!assignmentId || !studentKey) return;

  if (isDemo && !teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new AssignmentError(
      "teacher-only",
      "Only the section teacher or admin can save demo progress.",
    );
  }

  const totalProblems = Math.max(
    Number(assignment.problemCount) || 0,
    Object.keys(answers || {}).length,
  );
  const answeredCount = countAnswered(answers);
  const progressPercent = totalProblems
    ? Math.round((answeredCount / totalProblems) * 100)
    : 0;
  const progressRef = doc(progressCollection(school, section, assignmentId), studentKey);
  const progressSnapshot = opened ? await getDoc(progressRef) : null;
  const payload = {
    schoolId: getSchoolId(school),
    sectionId: getSectionId(section),
    assignmentId,
    studentName: getProgressStudentName({ isDemo, user }),
    studentEmail: getProgressStudentEmail({ isDemo, user }),
    isDemo,
    status,
    answeredCount,
    totalProblems,
    progressPercent,
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resubmissionAllowed,
    needsResubmission,
  };

  if (isDemo) {
    payload.demoStudentId = studentKey;
    payload.submittedByTeacherUid = actorUser?.uid || "";
    payload.submittedByTeacherEmail = actorUser?.email || "";
  } else {
    payload.studentUid = studentKey;
  }

  if (opened && !progressSnapshot?.data()?.openedAt) {
    payload.openedAt = serverTimestamp();
  }

  if (submitted) {
    payload.submittedAt = serverTimestamp();
    payload.attemptNumber = attemptNumber || 1;
    payload.score = score ?? 0;
    payload.gradePercent = gradePercent ?? 0;
  }

  await setDoc(progressRef, payload, { merge: true });
}

async function updateProgressFromSubmission({
  actorUser,
  assignment,
  role,
  school,
  section,
  submission,
  submissionKind,
  status,
}) {
  const isDemo = submissionKind === "demo";
  const user = isDemo
    ? {
        demoStudentId: submission.demoStudentId,
        displayName: submission.demoStudentName,
        email: submission.demoStudentEmail,
      }
    : {
        uid: submission.studentUid,
        displayName: submission.studentName,
        email: submission.studentEmail,
      };

  await writeAssignmentProgress({
    actorUser,
    answers: submission.answers || {},
    assignment,
    attemptNumber: Number(submission.attemptNumber) || 1,
    gradePercent: submission.gradePercent ?? submission.percent ?? null,
    isDemo,
    role,
    school,
    score: submission.score ?? submission.correctCount ?? null,
    section,
    resubmissionAllowed: submission.resubmissionAllowed === true,
    needsResubmission: status === "needs_resubmission",
    status,
    submitted: true,
    user,
  });
}

async function deleteAssignmentProgress({ assignment, school, section, studentId }) {
  if (!assignment?.assignmentId || !studentId) return;

  await deleteDoc(doc(progressCollection(school, section, assignment.assignmentId), studentId));
}

export function subscribeSectionAssignments(school, section, onNext, onError) {
  if (!school || !section) return () => {};

  const assignmentsQuery = query(
    assignmentCollection(school, section),
    where("active", "==", true),
  );

  return onSnapshot(
    assignmentsQuery,
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeAssignmentSubmissions(
  school,
  section,
  assignmentId,
  onNext,
  onError,
) {
  if (!school || !section || !assignmentId) return () => {};

  return onSnapshot(
    submissionCollection(school, section, assignmentId),
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeDemoAssignmentSubmissions(
  school,
  section,
  assignmentId,
  onNext,
  onError,
) {
  if (!school || !section || !assignmentId) return () => {};

  return onSnapshot(
    demoSubmissionCollection(school, section, assignmentId),
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeStudentSubmission(
  school,
  section,
  assignmentId,
  studentUid,
  onNext,
  onError,
) {
  if (!school || !section || !assignmentId || !studentUid) return () => {};

  return onSnapshot(
    doc(submissionCollection(school, section, assignmentId), studentUid),
    (snapshot) => onNext(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  );
}

export function subscribeDemoStudentSubmission(
  school,
  section,
  assignmentId,
  demoStudentId,
  onNext,
  onError,
) {
  if (!school || !section || !assignmentId || !demoStudentId) return () => {};

  return onSnapshot(
    doc(demoSubmissionCollection(school, section, assignmentId), demoStudentId),
    (snapshot) => onNext(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  );
}

export function subscribeAssignmentProgress(
  school,
  section,
  assignmentId,
  onNext,
  onError,
) {
  if (!school || !section || !assignmentId) return () => {};

  return onSnapshot(
    progressCollection(school, section, assignmentId),
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export async function recordAssignmentOpened({
  actorUser = null,
  assignment,
  role,
  school,
  section,
  testMode = false,
  user,
}) {
  await writeAssignmentProgress({
    actorUser,
    assignment,
    isDemo: testMode,
    opened: true,
    role,
    school,
    section,
    status: "started",
    user,
  });
}

export async function recordAssignmentAnswerProgress({
  actorUser = null,
  answers,
  assignment,
  role,
  school,
  section,
  testMode = false,
  user,
}) {
  const totalProblems = Math.max(
    Number(assignment?.problemCount) || 0,
    Object.keys(answers || {}).length,
  );
  const answeredCount = countAnswered(answers);

  await writeAssignmentProgress({
    actorUser,
    answers,
    assignment,
    isDemo: testMode,
    role,
    school,
    section,
    status: getProgressStatusFromAnswers({ answeredCount, totalProblems }),
    user,
  });
}

export async function createSectionAssignment({
  assignmentType,
  directions,
  dueDate,
  feedbackMode,
  maxAttempts,
  problemCount,
  role,
  school,
  section,
  timeLimitMinutes,
  title,
  user,
}) {
  if (!user || (role !== "teacher" && role !== "admin")) {
    throw new AssignmentError("teacher-only", "Only teachers can assign work.");
  }

  const sectionId = getSectionId(section);
  const schoolId = getSchoolId(school);

  if (!sectionId || !schoolId) {
    throw new AssignmentError("missing-section", "Unable to assign work to this section.");
  }

  const isOwner = section.teacherUid === user.uid;

  if (role !== "admin" && !isOwner) {
    throw new AssignmentError(
      "not-owner",
      "Only teachers can assign work to their own sections.",
    );
  }

  const cleanTitle = String(title || "").trim();
  const safeProblemCount = Math.max(1, Math.min(Number(problemCount) || 10, 60));

  if (!cleanTitle || !assignmentType) {
    throw new AssignmentError("missing-fields", "Choose work and enter an assignment title.");
  }

  const assignmentRef = doc(assignmentCollection(school, section));
  const assignmentId = assignmentRef.id;

  await setDoc(assignmentRef, {
    assignmentId,
    schoolId,
    sectionId,
    sectionName: section.sectionName || "",
    course: section.courseName || "",
    courseName: section.courseName || "",
    period: section.period || "",
    subject: section.curriculumSubject || "Mathematics",
    curriculumId: section.curriculumId || "math",
    curriculumTitle: section.curriculumTitle || "Math",
    curriculumSubject: section.curriculumSubject || "Mathematics",
    assignmentType,
    title: cleanTitle,
    directions,
    problemCount: safeProblemCount,
    dueDate: dueDate || "",
    feedbackMode: feedbackMode || "after-submit",
    maxAttempts: Math.max(1, Math.min(Number(maxAttempts) || 1, 10)),
    timeLimitMinutes: Math.max(0, Math.min(Number(timeLimitMinutes) || 0, 180)),
    active: true,
    teacherUid: user.uid,
    teacherName: user.displayName || user.email || "Teacher",
    teacherEmail: user.email || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return assignmentId;
}

export async function submitAssignmentWork({
  answers,
  assignment,
  correctCount,
  problemCount,
  school,
  section,
  user,
}) {
  if (!user || !assignment?.assignmentId) {
    throw new AssignmentError("missing-user", "Unable to submit this assignment.");
  }

  const submissionRef = doc(
    submissionCollection(school, section, assignment.assignmentId),
    user.uid,
  );
  const existingSnapshot = await getDoc(submissionRef);
  const existingSubmission = existingSnapshot.exists() ? existingSnapshot.data() : null;

  if (!canSubmitAgain(existingSubmission, assignment)) {
    throw new AssignmentError(
      "resubmission-closed",
      "Resubmission is not currently allowed for this assignment.",
    );
  }

  const attemptNumber = getAttemptNumber(existingSubmission);
  const maxAttempts = Math.max(getMaxAttempts(existingSubmission, assignment), attemptNumber);
  const gradePercent = percentFromScore(correctCount, problemCount);
  const attempt = buildAttempt({ answers, correctCount, problemCount, attemptNumber });
  const attempts = [...(existingSubmission?.attempts || []), attempt];

  await setDoc(
    submissionRef,
    {
      assignmentId: assignment.assignmentId,
      assignmentTitle: assignment.title,
      sectionId: getSectionId(section),
      schoolId: getSchoolId(school),
      studentUid: user.uid,
      studentName: user.displayName || user.email || "Student",
      studentEmail: user.email || "",
      answers,
      correctCount,
      score: correctCount,
      problemCount,
      percent: gradePercent,
      gradePercent,
      status: attemptNumber > 1 ? "resubmitted" : "submitted",
      attemptNumber,
      maxAttempts,
      attempts,
      feedback: existingSubmission?.feedback || "",
      resubmissionAllowed: false,
      resubmissionDueDate: existingSubmission?.resubmissionDueDate || "",
      isDemo: false,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writeAssignmentProgress({
    answers,
    assignment,
    attemptNumber,
    gradePercent,
    isDemo: false,
    school,
    score: correctCount,
    section,
    status: attemptNumber > 1 ? "resubmitted" : "submitted",
    submitted: true,
    user,
  });
}

export async function submitDemoAssignmentWork({
  actorUser,
  answers,
  assignment,
  correctCount,
  demoStudent,
  problemCount,
  role,
  school,
  section,
}) {
  if (!demoStudent?.demoStudentId || !assignment?.assignmentId) {
    throw new AssignmentError("missing-demo-student", "Choose a demo student first.");
  }

  if (!teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new AssignmentError(
      "teacher-only",
      "Only the section teacher or admin can save demo submissions.",
    );
  }

  const submissionRef = doc(
    demoSubmissionCollection(school, section, assignment.assignmentId),
    demoStudent.demoStudentId,
  );
  const existingSnapshot = await getDoc(submissionRef);
  const existingSubmission = existingSnapshot.exists() ? existingSnapshot.data() : null;

  if (!canSubmitAgain(existingSubmission, assignment)) {
    throw new AssignmentError(
      "resubmission-closed",
      "Resubmission is not currently allowed for this assignment.",
    );
  }

  const attemptNumber = getAttemptNumber(existingSubmission);
  const maxAttempts = Math.max(getMaxAttempts(existingSubmission, assignment), attemptNumber);
  const gradePercent = percentFromScore(correctCount, problemCount);
  const attempt = buildAttempt({ answers, correctCount, problemCount, attemptNumber });
  const attempts = [...(existingSubmission?.attempts || []), attempt];

  await setDoc(
    submissionRef,
    {
      assignmentId: assignment.assignmentId,
      assignmentTitle: assignment.title,
      sectionId: getSectionId(section),
      schoolId: getSchoolId(school),
      demoStudentId: demoStudent.demoStudentId,
      demoStudentName: demoStudent.displayName || "Demo Student",
      demoStudentEmail: demoStudent.email || "",
      isDemo: true,
      submittedByTeacherUid: actorUser.uid,
      submittedByTeacherEmail: actorUser.email || "",
      answers,
      correctCount,
      score: correctCount,
      problemCount,
      percent: gradePercent,
      gradePercent,
      status: attemptNumber > 1 ? "resubmitted" : "submitted",
      attemptNumber,
      maxAttempts,
      attempts,
      feedback: existingSubmission?.feedback || "",
      resubmissionAllowed: false,
      resubmissionDueDate: existingSubmission?.resubmissionDueDate || "",
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writeAssignmentProgress({
    actorUser,
    answers,
    assignment,
    attemptNumber,
    gradePercent,
    isDemo: true,
    role,
    school,
    score: correctCount,
    section,
    status: attemptNumber > 1 ? "resubmitted" : "submitted",
    submitted: true,
    user: demoStudent,
  });
}

export async function reviewAssignmentSubmission({
  actorUser,
  assignment,
  feedback = "",
  resubmissionAllowed = false,
  resubmissionDueDate = "",
  role,
  school,
  section,
  submission,
  submissionKind,
}) {
  if (!teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new AssignmentError(
      "teacher-only",
      "Only the section teacher or admin can review submissions.",
    );
  }

  const assignmentId = assignment?.assignmentId || submission?.assignmentId;
  const submissionId =
    submissionKind === "demo" ? submission?.demoStudentId : submission?.studentUid;

  if (!assignmentId || !submissionId) {
    throw new AssignmentError("missing-submission", "Unable to review this submission.");
  }

  const submissionRef = doc(
    submissionKind === "demo"
      ? demoSubmissionCollection(school, section, assignmentId)
      : submissionCollection(school, section, assignmentId),
    submissionId,
  );
  const attemptNumber = Number(submission.attemptNumber) || 1;
  const currentMaxAttempts = Math.max(
    Number(submission.maxAttempts) || 0,
    Number(assignment?.maxAttempts) || 1,
    1,
  );

  await updateDoc(submissionRef, {
    feedback: String(feedback || "").trim(),
    gradedAt: serverTimestamp(),
    maxAttempts: resubmissionAllowed
      ? Math.max(currentMaxAttempts, attemptNumber + 1)
      : currentMaxAttempts,
    resubmissionAllowed,
    resubmissionDueDate: resubmissionAllowed ? resubmissionDueDate || "" : "",
    reviewedByEmail: actorUser.email || "",
    reviewedByUid: actorUser.uid,
    status: resubmissionAllowed ? "needs_revision" : "graded",
    updatedAt: serverTimestamp(),
  });

  await updateProgressFromSubmission({
    actorUser,
    assignment,
    role,
    school,
    section,
    submission: {
      ...submission,
      feedback: String(feedback || "").trim(),
      maxAttempts: resubmissionAllowed
        ? Math.max(currentMaxAttempts, attemptNumber + 1)
        : currentMaxAttempts,
      resubmissionAllowed,
      resubmissionDueDate: resubmissionAllowed ? resubmissionDueDate || "" : "",
      status: resubmissionAllowed ? "needs_revision" : "graded",
    },
    submissionKind,
    status: resubmissionAllowed ? "needs_resubmission" : "graded",
  });
}

export async function resetAssignmentSubmission({
  actorUser,
  assignment,
  role,
  school,
  section,
  submissionKind,
  studentId,
}) {
  if (!teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new AssignmentError(
      "teacher-only",
      "Only the section teacher or admin can reset submissions.",
    );
  }

  if (!assignment?.assignmentId || !studentId) {
    throw new AssignmentError("missing-submission", "Unable to reset this submission.");
  }

  const submissionRef = doc(
    submissionKind === "demo"
      ? demoSubmissionCollection(school, section, assignment.assignmentId)
      : submissionCollection(school, section, assignment.assignmentId),
    studentId,
  );

  await deleteDoc(submissionRef);
  await deleteAssignmentProgress({ assignment, school, section, studentId });
}

export async function clearAssignmentSubmissions({
  actorUser,
  assignment,
  role,
  school,
  section,
}) {
  if (!teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new AssignmentError(
      "teacher-only",
      "Only the section teacher or admin can clear submissions.",
    );
  }

  if (!assignment?.assignmentId) {
    throw new AssignmentError("missing-assignment", "Choose an assignment first.");
  }

  const realSnapshot = await getDocs(
    submissionCollection(school, section, assignment.assignmentId),
  );
  const demoSnapshot = await getDocs(
    demoSubmissionCollection(school, section, assignment.assignmentId),
  );
  const progressSnapshot = await getDocs(
    progressCollection(school, section, assignment.assignmentId),
  );
  const submissionDocs = [...realSnapshot.docs, ...demoSnapshot.docs, ...progressSnapshot.docs];

  for (let index = 0; index < submissionDocs.length; index += 400) {
    const batch = writeBatch(db);
    submissionDocs.slice(index, index + 400).forEach((snapshot) => {
      batch.delete(snapshot.ref);
    });
    await batch.commit();
  }

  return submissionDocs.length;
}
