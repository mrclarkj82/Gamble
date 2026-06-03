import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const MATH_CURRICULUM_PACKAGE = {
  curriculumId: "math",
  title: "Math",
  subject: "Mathematics",
  description: "Pre-built Math curriculum.",
  gradeLevel: "General",
  active: true,
  isPrebuilt: true,
};

const PREBUILT_CURRICULUM_PACKAGES = [MATH_CURRICULUM_PACKAGE];

export function getAvailableCurriculumPackages() {
  return PREBUILT_CURRICULUM_PACKAGES;
}

export function getCurriculumPackage(curriculumId) {
  return PREBUILT_CURRICULUM_PACKAGES.find(
    (curriculum) => curriculum.curriculumId === curriculumId,
  );
}

export function getSectionCurriculum(section) {
  if (!section?.curriculumId) return null;

  return {
    curriculumId: section.curriculumId,
    title: section.curriculumTitle,
    subject: section.curriculumSubject,
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
