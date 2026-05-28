import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
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

function getInitials(value) {
  const words = cleanText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 4);

  const initials = words.map((word) => word[0]).join("").toUpperCase();

  return initials || "CLS";
}

function getTeacherCodeName(teacherName) {
  const parts = cleanText(teacherName || "Teacher").split(" ").filter(Boolean);
  return (parts.at(-1) || "TEACHER").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function getPeriodCode(period) {
  const cleaned = cleanText(period).replace(/[^a-z0-9]/gi, "").toUpperCase();
  return cleaned.startsWith("P") ? cleaned : `P${cleaned || "X"}`;
}

function randomCodePart(length = 6) {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((value) => CODE_ALPHABET[value % CODE_ALPHABET.length])
    .join("");
}

export function normalizeClassCode(code) {
  return cleanText(code).toUpperCase();
}

export function generateSectionName(courseName, period) {
  const cleanCourseName = cleanText(courseName);
  const cleanPeriod = cleanText(period);
  const periodLabel = cleanPeriod.toLowerCase().startsWith("period")
    ? cleanPeriod
    : `Period ${cleanPeriod}`;

  return `${cleanCourseName} - ${periodLabel}`;
}

export function generateClassCode(courseName, period, teacherName) {
  const teacherPart = getTeacherCodeName(teacherName).slice(0, 8);
  const coursePart = getInitials(courseName).slice(0, 5);
  const periodPart = getPeriodCode(period).slice(0, 6);

  return `${teacherPart}-${coursePart}-${periodPart}-${randomCodePart()}`;
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  return 0;
}

function sortByNewest(items, field = "createdAt") {
  return [...items].sort(
    (left, right) => timestampToMillis(right[field]) - timestampToMillis(left[field]),
  );
}

function sectionFromDoc(sectionDoc) {
  return {
    sectionId: sectionDoc.id,
    ...sectionDoc.data(),
  };
}

export async function createSection({
  courseName,
  period,
  role,
  schoolId,
  teacherUser,
}) {
  if (role !== "teacher" && role !== "admin") {
    throw new SectionError("teacher-only", "Only teachers can create sections.");
  }

  const cleanCourseName = cleanText(courseName);
  const cleanPeriod = cleanText(period);

  if (!cleanCourseName || !cleanPeriod) {
    throw new SectionError(
      "missing-fields",
      "Course name and period are required.",
    );
  }

  const teacherName = teacherUser.displayName || teacherUser.email || "Teacher";
  const teacherEmail = (teacherUser.email || "").toLowerCase();
  const sectionName = generateSectionName(cleanCourseName, cleanPeriod);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const sectionRef = doc(collection(db, "schools", schoolId, "sections"));
    const sectionId = sectionRef.id;
    const classCode = normalizeClassCode(
      generateClassCode(cleanCourseName, cleanPeriod, teacherName),
    );
    const codeRef = doc(db, "schools", schoolId, "classCodes", classCode);
    const teacherSectionRef = doc(db, "users", teacherUser.uid, "sections", sectionId);

    const result = await runTransaction(db, async (transaction) => {
      const existingCode = await transaction.get(codeRef);

      if (existingCode.exists()) {
        return null;
      }

      const section = {
        sectionId,
        schoolId,
        teacherUid: teacherUser.uid,
        teacherName,
        teacherEmail,
        courseName: cleanCourseName,
        period: cleanPeriod,
        sectionName,
        classCode,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        studentCount: 0,
      };

      const teacherSection = {
        sectionId,
        schoolId,
        courseName: cleanCourseName,
        period: cleanPeriod,
        sectionName,
        teacherUid: teacherUser.uid,
        teacherName,
        teacherEmail,
        classCode,
        roleInSection: "teacher",
        createdAt: serverTimestamp(),
        active: true,
      };

      const codeReservation = {
        classCode,
        sectionId,
        schoolId,
        teacherUid: teacherUser.uid,
        active: true,
        createdAt: serverTimestamp(),
      };

      transaction.set(sectionRef, section);
      transaction.set(teacherSectionRef, teacherSection);
      transaction.set(codeRef, codeReservation);

      return {
        ...section,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    if (result) {
      return result;
    }
  }

  throw new SectionError(
    "code-collision",
    "Unable to generate a unique class code. Please try again.",
  );
}

export async function getTeacherSections(schoolId, teacherUid) {
  const sectionsQuery = query(
    collection(db, "schools", schoolId, "sections"),
    where("teacherUid", "==", teacherUid),
  );

  const snapshot = await getDocs(sectionsQuery);
  return sortByNewest(snapshot.docs.map(sectionFromDoc), "createdAt");
}

export async function getAdminSections(schoolId) {
  const sectionsQuery = query(
    collection(db, "schools", schoolId, "sections"),
    where("active", "==", true),
  );

  const snapshot = await getDocs(sectionsQuery);
  return sortByNewest(snapshot.docs.map(sectionFromDoc), "createdAt");
}

export async function getStudentSections(studentUid) {
  const snapshot = await getDocs(collection(db, "users", studentUid, "sections"));
  return sortByNewest(snapshot.docs.map(sectionFromDoc), "joinedAt");
}

export async function getSectionRoster(schoolId, sectionId) {
  const rosterSnapshot = await getDocs(
    collection(db, "schools", schoolId, "sections", sectionId, "enrollments"),
  );

  return sortByNewest(
    rosterSnapshot.docs.map((studentDoc) => ({
      studentUid: studentDoc.id,
      ...studentDoc.data(),
    })),
    "joinedAt",
  );
}

export async function joinSectionByCode({
  classCode,
  role,
  schoolId,
  studentUser,
}) {
  if (role !== "student") {
    throw new SectionError("student-only", "Only students can join sections.");
  }

  const normalizedCode = normalizeClassCode(classCode);

  if (!normalizedCode) {
    throw new SectionError("invalid-code", "Invalid class code.");
  }

  const sectionsQuery = query(
    collection(db, "schools", schoolId, "sections"),
    where("classCode", "==", normalizedCode),
    where("active", "==", true),
    limit(1),
  );

  const sectionSnapshot = await getDocs(sectionsQuery);

  if (sectionSnapshot.empty) {
    throw new SectionError("invalid-code", "Invalid class code.");
  }

  const sectionRef = sectionSnapshot.docs[0].ref;
  const sectionId = sectionRef.id;
  const enrollmentRef = doc(
    db,
    "schools",
    schoolId,
    "sections",
    sectionId,
    "enrollments",
    studentUser.uid,
  );
  const userSectionRef = doc(db, "users", studentUser.uid, "sections", sectionId);

  return runTransaction(db, async (transaction) => {
    const currentSection = await transaction.get(sectionRef);

    if (!currentSection.exists() || currentSection.data().active !== true) {
      throw new SectionError("invalid-code", "Invalid class code.");
    }

    const existingUserSection = await transaction.get(userSectionRef);
    const existingEnrollment = await transaction.get(enrollmentRef);

    if (existingUserSection.exists() || existingEnrollment.exists()) {
      throw new SectionError(
        "already-enrolled",
        "You are already enrolled in this section.",
      );
    }

    const section = {
      sectionId,
      ...currentSection.data(),
    };

    const enrollment = {
      studentUid: studentUser.uid,
      studentName: studentUser.displayName || studentUser.email || "Student",
      studentEmail: studentUser.email || "",
      status: "active",
      joinedAt: serverTimestamp(),
    };

    const userSection = {
      sectionId,
      schoolId,
      courseName: section.courseName,
      period: section.period,
      sectionName: section.sectionName,
      teacherUid: section.teacherUid,
      teacherName: section.teacherName,
      teacherEmail: section.teacherEmail,
      classCode: section.classCode,
      roleInSection: "student",
      joinedAt: serverTimestamp(),
      status: "active",
    };

    transaction.set(enrollmentRef, enrollment);
    transaction.set(userSectionRef, userSection);
    transaction.update(sectionRef, {
      studentCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    return {
      ...userSection,
      joinedAt: new Date(),
    };
  });
}
