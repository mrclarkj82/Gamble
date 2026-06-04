import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ENGLISH_1_COURSE } from "../data/englishCurriculum";
import { db } from "../firebase";

export const MATH_CURRICULUM_PACKAGE = {
  curriculumId: "math",
  courseId: "algebra-1",
  title: "Algebra 1",
  alternateTitle: "Math",
  subject: "Mathematics",
  subjectKey: "math",
  description: "Pre-built Algebra 1 mathematics curriculum.",
  gradeLevel: "Grade 9 / Freshman",
  active: true,
  isPrebuilt: true,
};

const PREBUILT_CURRICULUM_PACKAGES = [MATH_CURRICULUM_PACKAGE, ENGLISH_1_COURSE];

export function getAvailableCurriculumPackages() {
  return PREBUILT_CURRICULUM_PACKAGES;
}

export function getCurriculumPackage(curriculumId) {
  return PREBUILT_CURRICULUM_PACKAGES.find(
    (curriculum) =>
      curriculum.curriculumId === curriculumId || curriculum.courseId === curriculumId,
  );
}

export function isMathCurriculum(curriculumId) {
  return curriculumId === "math" || curriculumId === "algebra-1";
}

export function isEnglishCurriculum(curriculumId) {
  return curriculumId === "english-1";
}

export function getCurriculumLabel(curriculumPackage) {
  if (!curriculumPackage) return "No curriculum";
  if (curriculumPackage.alternateTitle) {
    return `${curriculumPackage.title} (${curriculumPackage.alternateTitle})`;
  }

  return curriculumPackage.title;
}

export function getSectionCurriculum(section) {
  if (!section?.curriculumId) return null;

  const packageData = getCurriculumPackage(section.curriculumId);

  return {
    curriculumId: section.curriculumId,
    courseId: packageData?.courseId || section.curriculumId,
    title: section.curriculumTitle || packageData?.title,
    alternateTitle: packageData?.alternateTitle,
    subject: section.curriculumSubject || packageData?.subject,
    subjectKey: packageData?.subjectKey,
  };
}

export async function createOrUpdateCurriculumPackage(schoolId, curriculumPackage) {
  if (!schoolId || !curriculumPackage?.curriculumId) return;

  await setDoc(
    doc(db, "schools", schoolId, "curriculumPackages", curriculumPackage.curriculumId),
    {
      ...curriculumPackage,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
