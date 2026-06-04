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
  where,
  writeBatch,
} from "firebase/firestore";
import { englishUnit1AssignmentTemplates } from "../data/englishUnit1Pilot";
import { db } from "../firebase";

export class EnglishAssignmentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EnglishAssignmentError";
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
    (left, right) => timestampMillis(right.createdAt || right.assignedAt) - timestampMillis(left.createdAt || left.assignedAt),
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

function teacherCanWriteSection({ role, section, user }) {
  return Boolean(
    user && (role === "admin" || (role === "teacher" && section?.teacherUid === user.uid)),
  );
}

function getTemplate(templateId) {
  return englishUnit1AssignmentTemplates.find(
    (template) => template.assignmentTemplateId === templateId,
  );
}

function getQuestionTotal(questions = []) {
  return questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
}

function getAutoGradableQuestions(questions = []) {
  return questions.filter((question) =>
    ["multiple_choice", "select"].includes(question.type) && question.correctAnswer,
  );
}

function getTeacherReviewedQuestions(questions = []) {
  return questions.filter((question) => question.teacherReviewed || question.type === "short_response" || question.type === "annotation");
}

function countAnswered(answers = {}) {
  return Object.values(answers).filter((answer) => String(answer || "").trim()).length;
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

function getProgressStudentKey({ isDemo, user }) {
  return isDemo ? user?.demoStudentId : user?.uid;
}

function getProgressStudentName({ isDemo, user }) {
  if (isDemo) return user?.displayName || "Demo Student";
  return user?.displayName || user?.email || "Student";
}

function getProgressStudentEmail({ user }) {
  return user?.email || "";
}

function splitEnglishAnswers(assignment, answers = {}) {
  const annotations = {};
  const shortResponses = {};
  const selectedEvidence = {};

  (assignment.questions || []).forEach((question) => {
    const value = answers[question.questionId] || "";

    if (question.type === "annotation") annotations[question.questionId] = value;
    if (question.type === "short_response") shortResponses[question.questionId] = value;
    if (question.prompt?.toLowerCase().includes("evidence")) {
      selectedEvidence[question.questionId] = value;
    }
  });

  return { annotations, selectedEvidence, shortResponses };
}

export function gradeEnglishAnswers(assignment, answers = {}) {
  const questions = assignment?.questions || [];
  const autoQuestions = getAutoGradableQuestions(questions);
  const teacherQuestions = getTeacherReviewedQuestions(questions);
  let autoScore = 0;
  let autoPossible = 0;

  autoQuestions.forEach((question) => {
    const points = Number(question.points) || 0;
    autoPossible += points;
    if (String(answers[question.questionId] || "").trim() === question.correctAnswer) {
      autoScore += points;
    }
  });

  const teacherPossible = teacherQuestions.reduce(
    (sum, question) => sum + (Number(question.points) || 0),
    0,
  );
  const totalPossible = getQuestionTotal(questions);

  return {
    autoPossible,
    autoScore,
    gradePercent: autoPossible ? Math.round((autoScore / autoPossible) * 100) : 0,
    teacherPossible,
    teacherReviewRequired: teacherQuestions.length > 0,
    totalPossible,
  };
}

function getProgressStatus({ answeredCount, totalQuestions }) {
  if (answeredCount <= 0) return "started";
  const percent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  return percent >= 80 ? "nearly_done" : "working";
}

async function writeEnglishProgress({
  actorUser = null,
  answers = {},
  annotationCount = 0,
  assignment,
  attemptNumber = null,
  draftWordCount = 0,
  gradePercent = null,
  isDemo = false,
  opened = false,
  role,
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
    throw new EnglishAssignmentError(
      "teacher-only",
      "Only the section teacher or admin can save demo progress.",
    );
  }

  const totalQuestions = (assignment.questions || []).length;
  const answeredCount = countAnswered(answers);
  const progressPercent = totalQuestions
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;
  const progressRef = doc(progressCollection(school, section, assignmentId), studentKey);
  const progressSnapshot = opened ? await getDoc(progressRef) : null;
  const payload = {
    schoolId: getSchoolId(school),
    sectionId: getSectionId(section),
    assignmentId,
    subject: "english",
    courseId: "english-1",
    unitId: assignment.unitId || "english-1-unit-1",
    studentName: getProgressStudentName({ isDemo, user }),
    studentEmail: getProgressStudentEmail({ user }),
    isDemo,
    status,
    answeredCount,
    totalQuestions,
    annotationCount,
    draftWordCount,
    progressPercent,
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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

export function subscribeEnglishAssignments(school, section, onNext, onError) {
  if (!school || !section) return () => {};

  return onSnapshot(
    query(assignmentCollection(school, section), where("active", "==", true)),
    (snapshot) => {
      const assignments = readSnapshot(snapshot).filter(
        (assignment) => assignment.subject === "english" || assignment.courseId === "english-1",
      );
      onNext(sortNewest(assignments));
    },
    onError,
  );
}

export function subscribeEnglishSubmission(school, section, assignmentId, studentUid, onNext, onError) {
  if (!school || !section || !assignmentId || !studentUid) return () => {};

  return onSnapshot(
    doc(submissionCollection(school, section, assignmentId), studentUid),
    (snapshot) => onNext(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  );
}

export function subscribeEnglishDemoSubmission(
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

export function subscribeEnglishSubmissions(school, section, assignmentId, onNext, onError) {
  if (!school || !section || !assignmentId) return () => {};

  return onSnapshot(
    submissionCollection(school, section, assignmentId),
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeEnglishDemoSubmissions(school, section, assignmentId, onNext, onError) {
  if (!school || !section || !assignmentId) return () => {};

  return onSnapshot(
    demoSubmissionCollection(school, section, assignmentId),
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export async function createEnglishSectionAssignment({
  assignmentTemplateId,
  dueDate,
  feedbackSetting = "after-submit",
  maxAttempts = 1,
  role,
  school,
  section,
  user,
}) {
  if (!teacherCanWriteSection({ role, section, user })) {
    throw new EnglishAssignmentError(
      "teacher-only",
      "Only the section teacher or admin can assign English work.",
    );
  }

  const template = getTemplate(assignmentTemplateId);
  if (!template) {
    throw new EnglishAssignmentError("missing-template", "Choose a Unit 1 assignment.");
  }

  const assignmentRef = doc(assignmentCollection(school, section));
  const assignmentId = assignmentRef.id;
  const questions = template.questions || [];
  const payload = {
    assignmentId,
    schoolId: getSchoolId(school),
    sectionId: getSectionId(section),
    sectionName: section.sectionName || "",
    course: section.courseName || "English 1",
    courseName: section.courseName || "English 1",
    period: section.period || "",
    subject: "english",
    courseId: "english-1",
    curriculumId: "english-1",
    curriculumTitle: "English 1",
    curriculumSubject: "English Language Arts",
    unitId: template.unitId,
    lessonId: template.lessonId || "",
    assignmentTemplateId: template.assignmentTemplateId,
    assignmentType: template.assignmentType,
    title: template.title,
    directions: template.instructions,
    textIds: template.textIds || [],
    questions,
    problemCount: questions.length,
    dueDate: dueDate || "",
    feedbackMode: feedbackSetting,
    feedbackSetting,
    maxAttempts: Math.max(1, Math.min(Number(maxAttempts) || 1, 10)),
    timeLimitMinutes: 0,
    active: true,
    teacherUid: user.uid,
    teacherName: user.displayName || user.email || "Teacher",
    teacherEmail: user.email || "",
    assignedByUid: user.uid,
    assignedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(assignmentRef, payload);
  return assignmentId;
}

export async function recordEnglishAssignmentOpened({
  actorUser = null,
  assignment,
  role,
  school,
  section,
  testMode = false,
  user,
}) {
  await writeEnglishProgress({
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

export async function recordEnglishAnswerProgress({
  actorUser = null,
  answers,
  assignment,
  role,
  school,
  section,
  testMode = false,
  user,
}) {
  const { annotations, shortResponses } = splitEnglishAnswers(assignment, answers);
  const annotationCount = countAnswered(annotations);
  const draftWordCount = Object.values(shortResponses)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const totalQuestions = (assignment.questions || []).length;
  const answeredCount = countAnswered(answers);

  await writeEnglishProgress({
    actorUser,
    answers,
    annotationCount,
    assignment,
    draftWordCount,
    isDemo: testMode,
    role,
    school,
    section,
    status: getProgressStatus({ answeredCount, totalQuestions }),
    user,
  });
}

async function submitEnglishWork({
  actorUser = null,
  answers,
  assignment,
  isDemo,
  role,
  school,
  section,
  user,
}) {
  const assignmentId = assignment?.assignmentId;
  if (!assignmentId || !user) {
    throw new EnglishAssignmentError("missing-user", "Unable to submit this English assignment.");
  }

  if (isDemo && !teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new EnglishAssignmentError(
      "teacher-only",
      "Only the section teacher or admin can save demo English submissions.",
    );
  }

  const submissionId = isDemo ? user.demoStudentId : user.uid;
  const submissionRef = doc(
    isDemo
      ? demoSubmissionCollection(school, section, assignmentId)
      : submissionCollection(school, section, assignmentId),
    submissionId,
  );
  const existingSnapshot = await getDoc(submissionRef);
  const existingSubmission = existingSnapshot.exists() ? existingSnapshot.data() : null;

  if (!canSubmitAgain(existingSubmission, assignment)) {
    throw new EnglishAssignmentError(
      "resubmission-closed",
      "Resubmission is not currently allowed for this assignment.",
    );
  }

  const attemptNumber = getAttemptNumber(existingSubmission);
  const maxAttempts = Math.max(getMaxAttempts(existingSubmission, assignment), attemptNumber);
  const grading = gradeEnglishAnswers(assignment, answers);
  const { annotations, selectedEvidence, shortResponses } = splitEnglishAnswers(assignment, answers);
  const attempt = {
    attemptNumber,
    answers,
    annotations,
    autoPossible: grading.autoPossible,
    autoScore: grading.autoScore,
    gradePercent: grading.gradePercent,
    selectedEvidence,
    shortResponses,
    submittedAt: new Date().toISOString(),
  };
  const attempts = [...(existingSubmission?.attempts || []), attempt];
  const basePayload = {
    assignmentId,
    assignmentTitle: assignment.title,
    schoolId: getSchoolId(school),
    sectionId: getSectionId(section),
    subject: "english",
    courseId: "english-1",
    unitId: assignment.unitId || "english-1-unit-1",
    answers,
    annotations,
    selectedEvidence,
    shortResponses,
    correctCount: grading.autoScore,
    score: grading.autoScore,
    autoScore: grading.autoScore,
    autoPossible: grading.autoPossible,
    teacherPossible: grading.teacherPossible,
    problemCount: grading.totalPossible || (assignment.questions || []).length,
    percent: grading.gradePercent,
    gradePercent: grading.gradePercent,
    teacherReviewRequired: grading.teacherReviewRequired,
    status: attemptNumber > 1 ? "resubmitted" : "submitted",
    attemptNumber,
    maxAttempts,
    attempts,
    feedback: existingSubmission?.feedback || "",
    teacherFeedback: existingSubmission?.teacherFeedback || "",
    resubmissionAllowed: false,
    resubmissionDueDate: existingSubmission?.resubmissionDueDate || "",
    isDemo,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (isDemo) {
    basePayload.demoStudentId = user.demoStudentId;
    basePayload.demoStudentName = user.displayName || "Demo Student";
    basePayload.demoStudentEmail = user.email || "";
    basePayload.submittedByTeacherUid = actorUser.uid;
    basePayload.submittedByTeacherEmail = actorUser.email || "";
  } else {
    basePayload.studentUid = user.uid;
    basePayload.studentName = user.displayName || user.email || "Student";
    basePayload.studentEmail = user.email || "";
  }

  await setDoc(submissionRef, basePayload, { merge: true });

  try {
    await writeEnglishProgress({
      actorUser,
      answers,
      annotationCount: countAnswered(annotations),
      assignment,
      attemptNumber,
      draftWordCount: Object.values(shortResponses).join(" ").split(/\s+/).filter(Boolean).length,
      gradePercent: grading.gradePercent,
      isDemo,
      role,
      school,
      score: grading.autoScore,
      section,
      status: attemptNumber > 1 ? "resubmitted" : "submitted",
      submitted: true,
      user,
    });
  } catch (error) {
    console.warn("English submission was saved, but progress tracking failed", error);
  }
}

export async function submitEnglishAssignmentWork(options) {
  await submitEnglishWork({ ...options, isDemo: false });
}

export async function submitEnglishDemoAssignmentWork(options) {
  await submitEnglishWork({ ...options, isDemo: true });
}

export async function reviewEnglishSubmission({
  actorUser,
  assignment,
  feedback = "",
  finalScore,
  resubmissionAllowed = false,
  resubmissionDueDate = "",
  role,
  school,
  section,
  submission,
  submissionKind,
}) {
  if (!teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new EnglishAssignmentError(
      "teacher-only",
      "Only the section teacher or admin can review English submissions.",
    );
  }

  const assignmentId = assignment?.assignmentId || submission?.assignmentId;
  const submissionId = submissionKind === "demo" ? submission?.demoStudentId : submission?.studentUid;
  if (!assignmentId || !submissionId) {
    throw new EnglishAssignmentError("missing-submission", "Unable to review this submission.");
  }

  const possible = Number(submission.problemCount) || Number(submission.teacherPossible) + Number(submission.autoPossible) || 1;
  const score = Math.max(0, Math.min(Number(finalScore) || 0, possible));
  const gradePercent = possible ? Math.round((score / possible) * 100) : 0;
  const attemptNumber = Number(submission.attemptNumber) || 1;
  const currentMaxAttempts = Math.max(
    Number(submission.maxAttempts) || 0,
    Number(assignment?.maxAttempts) || 1,
    1,
  );
  const submissionRef = doc(
    submissionKind === "demo"
      ? demoSubmissionCollection(school, section, assignmentId)
      : submissionCollection(school, section, assignmentId),
    submissionId,
  );

  await updateDoc(submissionRef, {
    feedback: String(feedback || "").trim(),
    teacherFeedback: String(feedback || "").trim(),
    score,
    gradePercent,
    percent: gradePercent,
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

  await writeEnglishProgress({
    actorUser,
    answers: submission.answers || {},
    annotationCount: countAnswered(submission.annotations || {}),
    assignment,
    attemptNumber,
    draftWordCount: Object.values(submission.shortResponses || {}).join(" ").split(/\s+/).filter(Boolean).length,
    gradePercent,
    isDemo: submissionKind === "demo",
    role,
    school,
    score,
    section,
    status: resubmissionAllowed ? "needs_resubmission" : "graded",
    submitted: true,
    user:
      submissionKind === "demo"
        ? {
            demoStudentId: submission.demoStudentId,
            displayName: submission.demoStudentName,
            email: submission.demoStudentEmail,
          }
        : {
            uid: submission.studentUid,
            displayName: submission.studentName,
            email: submission.studentEmail,
          },
  });
}

export async function resetEnglishSubmission({
  actorUser,
  assignment,
  role,
  school,
  section,
  studentId,
  submissionKind,
}) {
  if (!teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new EnglishAssignmentError(
      "teacher-only",
      "Only the section teacher or admin can reset English submissions.",
    );
  }

  const submissionRef = doc(
    submissionKind === "demo"
      ? demoSubmissionCollection(school, section, assignment.assignmentId)
      : submissionCollection(school, section, assignment.assignmentId),
    studentId,
  );
  await deleteDoc(submissionRef);
  await deleteDoc(doc(progressCollection(school, section, assignment.assignmentId), studentId));
}

export async function clearEnglishSubmissions({ actorUser, assignment, role, school, section }) {
  if (!teacherCanWriteSection({ role, section, user: actorUser })) {
    throw new EnglishAssignmentError(
      "teacher-only",
      "Only the section teacher or admin can clear English submissions.",
    );
  }

  const realSnapshot = await getDocs(submissionCollection(school, section, assignment.assignmentId));
  const demoSnapshot = await getDocs(demoSubmissionCollection(school, section, assignment.assignmentId));
  const progressSnapshot = await getDocs(progressCollection(school, section, assignment.assignmentId));
  const docs = [...realSnapshot.docs, ...demoSnapshot.docs, ...progressSnapshot.docs];

  for (let index = 0; index < docs.length; index += 400) {
    const batch = writeBatch(db);
    docs.slice(index, index + 400).forEach((snapshot) => batch.delete(snapshot.ref));
    await batch.commit();
  }

  return docs.length;
}
