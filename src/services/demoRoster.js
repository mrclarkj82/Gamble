import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const DEMO_STUDENTS = [
  ["Alex", "Rivera"],
  ["Maya", "Johnson"],
  ["Ethan", "Patel"],
  ["Sofia", "Chen"],
  ["Noah", "Williams"],
  ["Ava", "Martinez"],
  ["Liam", "Garcia"],
  ["Isabella", "Brown"],
  ["Mateo", "Lopez"],
  ["Mia", "Anderson"],
  ["Jackson", "Taylor"],
  ["Emma", "Thomas"],
  ["Lucas", "Moore"],
  ["Aria", "Wilson"],
  ["Caleb", "Davis"],
  ["Nora", "Clark"],
];

export class DemoRosterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DemoRosterError";
    this.code = code;
  }
}

function getSchoolId(school) {
  return school?.schoolId || school?.id || "doral-red-rock";
}

function getSectionId(section) {
  return section?.sectionId || section?.id;
}

function teacherCanManageDemoRoster({ role, section, user }) {
  return Boolean(
    user && (role === "admin" || (role === "teacher" && section?.teacherUid === user.uid)),
  );
}

function cleanName(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function slug(value = "") {
  return cleanName(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function demoStudentsCollection(school, section) {
  return collection(
    db,
    "schools",
    getSchoolId(school),
    "sections",
    getSectionId(section),
    "demoStudents",
  );
}

function assignmentsCollection(school, section) {
  return collection(
    db,
    "schools",
    getSchoolId(school),
    "sections",
    getSectionId(section),
    "assignments",
  );
}

function demoSubmissionsCollection(school, section, assignmentId) {
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

function readSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function sortByName(items) {
  return [...items].sort((left, right) =>
    (left.displayName || "").localeCompare(right.displayName || ""),
  );
}

function buildDemoStudent({ firstName, index, lastName, school, section, user }) {
  const schoolId = getSchoolId(school);
  const sectionId = getSectionId(section);
  const displayName = `${firstName} ${lastName}`;
  const demoStudentId = `demo-${slug(sectionId).slice(0, 10)}-${String(index).padStart(
    2,
    "0",
  )}-${slug(firstName).slice(0, 8)}-${slug(lastName).slice(0, 8)}`;

  return {
    demoStudentId,
    firstName,
    lastName,
    displayName,
    email: `demo.${slug(firstName)}.${slug(lastName)}@student.example`,
    schoolId,
    sectionId,
    status: "active",
    isDemo: true,
    createdAt: serverTimestamp(),
    createdByUid: user.uid,
    updatedAt: serverTimestamp(),
  };
}

function validateTeacherAccess({ role, section, user }) {
  if (!teacherCanManageDemoRoster({ role, section, user })) {
    throw new DemoRosterError(
      "teacher-only",
      "Only the section teacher or admin can manage demo students.",
    );
  }
}

export function subscribeDemoStudents(school, section, onNext, onError) {
  if (!school || !section) return () => {};

  return onSnapshot(
    demoStudentsCollection(school, section),
    (snapshot) => onNext(sortByName(readSnapshot(snapshot))),
    onError,
  );
}

export async function generateDemoRoster({ count = 16, role, school, section, user }) {
  validateTeacherAccess({ role, section, user });

  const batch = writeBatch(db);
  const students = DEMO_STUDENTS.slice(0, Math.max(1, Math.min(count, DEMO_STUDENTS.length)));

  students.forEach(([firstName, lastName], index) => {
    const student = buildDemoStudent({
      firstName,
      index: index + 1,
      lastName,
      school,
      section,
      user,
    });
    batch.set(doc(demoStudentsCollection(school, section), student.demoStudentId), student, {
      merge: true,
    });
  });

  await batch.commit();
  return students.length;
}

export async function addDemoStudent({ firstName, lastName, role, school, section, user }) {
  validateTeacherAccess({ role, section, user });

  const cleanFirstName = cleanName(firstName);
  const cleanLastName = cleanName(lastName);

  if (!cleanFirstName || !cleanLastName) {
    throw new DemoRosterError("missing-name", "Enter a first and last name.");
  }

  const student = buildDemoStudent({
    firstName: cleanFirstName,
    index: Date.now().toString().slice(-5),
    lastName: cleanLastName,
    school,
    section,
    user,
  });

  const batch = writeBatch(db);
  batch.set(doc(demoStudentsCollection(school, section), student.demoStudentId), student);
  await batch.commit();
  return student;
}

async function commitInChunks(operations) {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = writeBatch(db);
    operations.slice(index, index + 400).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

export async function clearDemoSubmissions({ role, school, section, user }) {
  validateTeacherAccess({ role, section, user });

  const assignmentSnapshots = await getDocs(assignmentsCollection(school, section));
  const operations = [];

  for (const assignmentDoc of assignmentSnapshots.docs) {
    const demoSubmissionSnapshots = await getDocs(
      demoSubmissionsCollection(school, section, assignmentDoc.id),
    );
    demoSubmissionSnapshots.docs.forEach((submissionDoc) => {
      operations.push((batch) => batch.delete(submissionDoc.ref));
    });
  }

  if (operations.length) {
    await commitInChunks(operations);
  }

  return operations.length;
}

export async function clearDemoRoster({ role, school, section, user }) {
  validateTeacherAccess({ role, section, user });

  const demoStudentSnapshots = await getDocs(demoStudentsCollection(school, section));
  const operations = [];

  demoStudentSnapshots.docs.forEach((studentDoc) => {
    operations.push((batch) => batch.delete(studentDoc.ref));
  });

  const deletedSubmissions = await clearDemoSubmissions({ role, school, section, user });

  if (operations.length) {
    await commitInChunks(operations);
  }

  return {
    deletedStudents: operations.length,
    deletedSubmissions,
  };
}
