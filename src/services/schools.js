import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export async function verifySchoolCode(code) {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const schoolsQuery = query(
    collection(db, "schools"),
    where("schoolCode", "==", normalizedCode),
    where("active", "==", true),
    limit(1),
  );

  const snapshot = await getDocs(schoolsQuery);

  if (snapshot.empty) {
    return null;
  }

  const schoolDoc = snapshot.docs[0];

  return {
    ...schoolDoc.data(),
    schoolId: schoolDoc.id,
  };
}
