import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import AccessDenied from "./components/AccessDenied";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";
import LoginPage from "./components/LoginPage";
import SchoolCodePage from "./components/SchoolCodePage";
import { auth } from "./firebase";
import { signInWithGoogle, signOutUser } from "./services/auth";
import { verifySchoolCode } from "./services/schools";
import { createOrUpdateUserProfile, getUserProfile } from "./services/users";
import {
  getRoleFromEmail,
  isEmailAllowedForSchool,
} from "./utils/roles";

const STATUS = {
  LOADING: "loading",
  LOGIN: "login",
  DENIED: "denied",
  SCHOOL_CODE: "school-code",
  DASHBOARD: "dashboard",
};

function profileHasSchool(profile) {
  return Boolean(profile?.schoolId && profile?.schoolName);
}

function schoolFromProfile(profile) {
  return {
    schoolId: profile.schoolId,
    name: profile.schoolName,
    schoolCode: profile.schoolCodeUsed,
  };
}

export default function App() {
  const [status, setStatus] = useState(STATUS.LOADING);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [school, setSchool] = useState(null);
  const [accessDeniedEmail, setAccessDeniedEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [schoolCodeError, setSchoolCodeError] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setStatus(STATUS.LOADING);
      setAuthError("");
      setSchoolCodeError("");

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setSchool(null);
        setAccessDeniedEmail("");
        setStatus(STATUS.LOGIN);
        return;
      }

      const detectedRole = getRoleFromEmail(firebaseUser.email);

      if (!detectedRole) {
        setUser(firebaseUser);
        setRole(null);
        setSchool(null);
        setAccessDeniedEmail(firebaseUser.email || "");
        setStatus(STATUS.DENIED);
        return;
      }

      setUser(firebaseUser);
      setRole(detectedRole);
      setAccessDeniedEmail("");

      try {
        const profile = await getUserProfile(firebaseUser.uid);

        if (profileHasSchool(profile)) {
          setSchool(schoolFromProfile(profile));
          setStatus(STATUS.DASHBOARD);
          return;
        }
      } catch (error) {
        console.error("Profile lookup failed", error);
        setSchoolCodeError(
          "We could not load an existing profile. Enter your school code to continue.",
        );
      }

      setStatus(STATUS.SCHOOL_CODE);
    });

    return unsubscribe;
  }, []);

  async function handleSignIn() {
    setAuthError("");

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in failed", error);
      setAuthError(
        "Google sign-in could not be completed. Check Firebase config and authorized domains.",
      );
    }
  }

  async function handleSignOut() {
    setAuthError("");
    setSchoolCodeError("");
    await signOutUser();
  }

  async function handleSchoolCodeSubmit(code) {
    if (!user || !role) return;

    setSchoolCodeError("");
    setIsVerifyingCode(true);

    try {
      const verifiedSchool = await verifySchoolCode(code);

      if (!verifiedSchool) {
        setSchoolCodeError("That school code is invalid or inactive.");
        return;
      }

      if (!isEmailAllowedForSchool(user.email, role, verifiedSchool)) {
        setSchoolCodeError(
          "That school code does not match the domain on your Google account.",
        );
        return;
      }

      await createOrUpdateUserProfile(user, role, verifiedSchool);
      setSchool(verifiedSchool);
      setStatus(STATUS.DASHBOARD);
    } catch (error) {
      console.error("School code verification failed", error);
      setSchoolCodeError(
        "We could not verify the school code. Check Firestore setup and try again.",
      );
    } finally {
      setIsVerifyingCode(false);
    }
  }

  if (status === STATUS.LOADING) {
    return <LoadingScreen />;
  }

  if (status === STATUS.LOGIN) {
    return <LoginPage error={authError} onSignIn={handleSignIn} />;
  }

  if (status === STATUS.DENIED) {
    return (
      <AccessDenied email={accessDeniedEmail} onSignOut={handleSignOut} />
    );
  }

  if (status === STATUS.SCHOOL_CODE) {
    return (
      <SchoolCodePage
        displayName={user?.displayName}
        email={user?.email}
        error={schoolCodeError}
        isVerifying={isVerifyingCode}
        onSignOut={handleSignOut}
        onSubmit={handleSchoolCodeSubmit}
      />
    );
  }

  return (
    <Dashboard
      role={role}
      school={school}
      user={user}
      onSignOut={handleSignOut}
    />
  );
}
