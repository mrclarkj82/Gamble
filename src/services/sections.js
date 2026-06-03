import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class SectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SectionError";
    this.code = code;
  }
}

function cleanText(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
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

function getInitials(value) {
  const initials = cleanText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "CLASS";
}

function getPeriodCode(period) {
  const cleanPeriod = cleanText(period).replace(/[^a-z0-9]/gi, "").toUpperCase();
  return cleanPeriod.startsWith("P") ? cleanPeriod : `P${cleanPeriod || "X"}`;
}

function getTeacherCodeName(teacherName) {
  const parts = cleanText(teacherName || "Teacher").split(" ").filter(Boolean);
  return (parts.at(-1) || "TEACHER").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function randomCodePart(length = 4) {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((value) => CODE_ALPHABET[value % CODE_ALPHABET.length])
    .join("");
}

function getSchoolId(school) {
  return school?.schoolId || school?.id || "doral-red-rock";
}

function sectionCollection(schoolId) {
  return collection(db, "schools", schoolId, "sections");
}

function enrollmentCollection(schoolId, sectionId) {
  return collection(db, "schools", schoolId, "sections", sectionId, "enrollments");
}

function demoStudentCollection(schoolId, sectionId) {
  return collection(db, "schools", schoolId, "sections", sectionId, "demoStudents");
}

export function normalizeClassCode(code) {
  return cleanText(code).toUpperCase();
}

export function generateSectionName(courseName, period) {
  const periodText = cleanText(period);
  const periodLabel = periodText.toLowerCase().startsWith("period")
    ? periodText
    : `Period ${periodText}`;

  return `${cleanText(courseName)} - ${periodLabel}`;
}

export function generateClassCode(courseName, period, teacherName) {
  return normalizeClassCode(
    `${getTeacherCodeName(teacherName).slice(0, 8)}-${getInitials(courseName).slice(
      0,
      5,
    )}-${getPeriodCode(period).slice(0, 6)}-${randomCodePart()}`,
  );
}

export function subscribeTeacherSections(school, teacherUid, onNext, onError) {
  const schoolId = getSchoolId(school);
  const sectionsQuery = query(
    sectionCollection(schoolId),
    where("teacherUid", "==", teacherUid),
    where("active", "==", true),
  );

  return onSnapshot(
    sectionsQuery,
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeAdminSections(school, onNext, onError) {
  const schoolId = getSchoolId(school);
  const sectionsQuery = query(sectionCollection(schoolId), where("active", "==", true));

  return onSnapshot(
    sectionsQuery,
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeStudentSections(studentUid, onNext, onError) {
  return onSnapshot(
    collection(db, "users", studentUid, "sections"),
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeSectionRoster(school, sectionId, onNext, onError) {
  const schoolId = getSchoolId(school);

  return onSnapshot(
    enrollmentCollection(schoolId, sectionId),
    (snapshot) => onNext(sortNewest(readSnapshot(snapshot))),
    onError,
  );
}

export function subscribeActiveRosterCount(school, section, onNext, onError) {
  const schoolId = getSchoolId(school);
  const sectionId = section?.sectionId || section?.id;

  if (!schoolId || !sectionId) return () => {};

  const counts = {
    demo: null,
    real: null,
  };

  function emitWhenReady() {
    if (counts.demo === null || counts.real === null) return;
    onNext(counts.demo + counts.real);
  }

  function handleError(error) {
    console.warn("Unable to load active roster count", { error, sectionId });
    if (onError) onError(error);
  }

  const unsubscribeEnrollments = onSnapshot(
    query(enrollmentCollection(schoolId, sectionId), where("status", "==", "active")),
    (snapshot) => {
      counts.real = snapshot.size;
      emitWhenReady();
    },
    handleError,
  );

  const unsubscribeDemoStudents = onSnapshot(
    query(demoStudentCollection(schoolId, sectionId), where("status", "==", "active")),
    (snapshot) => {
      counts.demo = snapshot.size;
      emitWhenReady();
    },
    handleError,
  );

  return () => {
    unsubscribeEnrollments();
    unsubscribeDemoStudents();
  };
}

export async function createSection({
  courseName,
  curriculumPackage,
  period,
  role,
  school,
  user,
}) {
  if (!user || (role !== "teacher" && role !== "admin")) {
    throw new SectionError("teacher-only", "Only teachers can create sections.");
  }

  const cleanCourseName = cleanText(courseName);
  const cleanPeriod = cleanText(period);

  if (!cleanCourseName || !cleanPeriod) {
    throw new SectionError("missing-fields", "Enter a course name and period.");
  }

  if (!curriculumPackage?.curriculumId) {
    throw new SectionError("missing-curriculum", "Please select a curriculum package.");
  }

  const schoolId = getSchoolId(school);
  const teacherName = user.displayName || user.email || "Teacher";
  const teacherEmail = user.email || "";
  const sectionName = generateSectionName(cleanCourseName, cleanPeriod);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const sectionRef = doc(sectionCollection(schoolId));
    const sectionId = sectionRef.id;
    const classCode = generateClassCode(cleanCourseName, cleanPeriod, teacherName);
    const codeRef = doc(db, "schools", schoolId, "classCodes", classCode);
    const teacherSectionRef = doc(db, "users", user.uid, "sections", sectionId);

    const createdSection = await runTransaction(db, async (transaction) => {
      const codeSnapshot = await transaction.get(codeRef);

      if (codeSnapshot.exists()) return null;

      const sectionPayload = {
        sectionId,
        schoolId,
        teacherUid: user.uid,
        teacherName,
        teacherEmail,
        courseName: cleanCourseName,
        period: cleanPeriod,
        sectionName,
        classCode,
        classCodeUpper: classCode,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        studentCount: 0,
        studentUids: [],
        curriculumId: curriculumPackage.curriculumId,
        curriculumTitle: curriculumPackage.title,
        curriculumSubject: curriculumPackage.subject,
      };

      const teacherSectionPayload = {
        sectionId,
        schoolId,
        courseName: cleanCourseName,
        period: cleanPeriod,
        sectionName,
        teacherUid: user.uid,
        teacherName,
        teacherEmail,
        classCode,
        classCodeUpper: classCode,
        roleInSection: "teacher",
        curriculumId: curriculumPackage.curriculumId,
        curriculumTitle: curriculumPackage.title,
        curriculumSubject: curriculumPackage.subject,
        createdAt: serverTimestamp(),
        active: true,
      };

      transaction.set(sectionRef, sectionPayload);
      transaction.set(teacherSectionRef, teacherSectionPayload);
      transaction.set(codeRef, {
        classCode,
        classCodeUpper: classCode,
        sectionId,
        schoolId,
        active: true,
        teacherUid: user.uid,
        curriculumId: curriculumPackage.curriculumId,
        createdAt: serverTimestamp(),
      });

      return {
        ...sectionPayload,
        id: sectionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    if (createdSection) return createdSection;
  }

  throw new SectionError(
    "code-collision",
    "Unable to generate a unique class code. Please try again.",
  );
}

export async function joinSectionByCode({ classCode, role, school, user }) {
  if (!user || role !== "student") {
    throw new SectionError("student-only", "Only students can join sections.");
  }

  const normalizedCode = normalizeClassCode(classCode);

  if (!normalizedCode) {
    throw new SectionError("invalid-code", "Invalid class code.");
  }

  const schoolId = getSchoolId(school);
  const codeSnapshot = await getDoc(
    doc(db, "schools", schoolId, "classCodes", normalizedCode),
  );

  if (!codeSnapshot.exists() || codeSnapshot.data().active !== true) {
    throw new SectionError("invalid-code", "Invalid class code.");
  }

  const sectionId = codeSnapshot.data().sectionId;
  const sectionRef = doc(db, "schools", schoolId, "sections", sectionId);
  const enrollmentRef = doc(
    db,
    "schools",
    schoolId,
    "sections",
    sectionId,
    "enrollments",
    user.uid,
  );
  const userSectionRef = doc(db, "users", user.uid, "sections", sectionId);

  return runTransaction(db, async (transaction) => {
    const sectionSnapshot = await transaction.get(sectionRef);
    const enrollmentSnapshot = await transaction.get(enrollmentRef);
    const userSectionSnapshot = await transaction.get(userSectionRef);

    if (!sectionSnapshot.exists() || sectionSnapshot.data().active !== true) {
      throw new SectionError("invalid-code", "Invalid class code.");
    }

    if (enrollmentSnapshot.exists() || userSectionSnapshot.exists()) {
      throw new SectionError(
        "already-enrolled",
        "You are already enrolled in this section.",
      );
    }

    const section = {
      id: sectionSnapshot.id,
      ...sectionSnapshot.data(),
    };

    if (section.schoolId !== schoolId) {
      throw new SectionError("invalid-code", "Invalid class code.");
    }

    const enrollment = {
      studentUid: user.uid,
      studentName: user.displayName || user.email || "Student",
      studentEmail: user.email || "",
      status: "active",
      joinedAt: serverTimestamp(),
    };

    const userSection = {
      sectionId,
      schoolId,
      courseName: section.courseName || "",
      period: section.period || "",
      sectionName: section.sectionName || "",
      teacherUid: section.teacherUid,
      teacherName: section.teacherName || "Teacher",
      teacherEmail: section.teacherEmail || "",
      classCode: section.classCode,
      classCodeUpper: section.classCodeUpper || section.classCode,
      roleInSection: "student",
      joinedAt: serverTimestamp(),
      status: "active",
      curriculumId: section.curriculumId || "",
      curriculumTitle: section.curriculumTitle || "",
      curriculumSubject: section.curriculumSubject || "",
    };

    transaction.set(enrollmentRef, enrollment);
    transaction.set(userSectionRef, userSection);
    transaction.update(sectionRef, {
      studentCount: increment(1),
      studentUids: arrayUnion(user.uid),
      updatedAt: serverTimestamp(),
    });

    return {
      ...userSection,
      joinedAt: new Date(),
    };
  });
}

export async function removeStudentFromSection({ role, school, section, student, user }) {
  if (!user || !section || !student?.studentUid) return;

  const isOwner = section.teacherUid === user.uid;

  if (role !== "admin" && !isOwner) {
    throw new SectionError(
      "teacher-only",
      "Only teachers can remove students from their rosters.",
    );
  }

  const schoolId = getSchoolId(school);
  const sectionId = section.sectionId || section.id;
  const sectionRef = doc(db, "schools", schoolId, "sections", sectionId);
  const enrollmentRef = doc(
    db,
    "schools",
    schoolId,
    "sections",
    sectionId,
    "enrollments",
    student.studentUid,
  );
  const userSectionRef = doc(db, "users", student.studentUid, "sections", sectionId);

  await runTransaction(db, async (transaction) => {
    const enrollmentSnapshot = await transaction.get(enrollmentRef);

    if (!enrollmentSnapshot.exists()) return;

    transaction.delete(enrollmentRef);
    transaction.delete(userSectionRef);
    transaction.update(sectionRef, {
      studentCount: increment(-1),
      studentUids: arrayRemove(student.studentUid),
      updatedAt: serverTimestamp(),
    });
  });
}
