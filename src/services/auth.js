import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}
