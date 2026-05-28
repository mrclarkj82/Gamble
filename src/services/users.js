import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function getUserProfile(uid) {
  const profileRef = doc(db, "users", uid);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    return null;
  }

  return profileSnap.data();
}

export async function createOrUpdateUserProfile(user, role, school) {
  const profileRef = doc(db, "users", user.uid);
  const existingProfile = await getDoc(profileRef);

  const profile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    role,
    schoolId: school.schoolId,
    schoolName: school.name,
    schoolCodeUsed: school.schoolCode,
    lastLogin: serverTimestamp(),
  };

  if (!existingProfile.exists()) {
    profile.createdAt = serverTimestamp();
  }

  await setDoc(profileRef, profile, { merge: true });

  return {
    ...profile,
    createdAt: existingProfile.exists()
      ? existingProfile.data().createdAt
      : profile.createdAt,
  };
}
