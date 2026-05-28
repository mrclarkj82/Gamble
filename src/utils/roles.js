import { ADMIN_EMAIL, STUDENT_DOMAIN, TEACHER_DOMAIN } from "../constants";

export function getRoleFromEmail(email) {
  if (!email) return null;

  const normalized = email.trim().toLowerCase();

  if (normalized === ADMIN_EMAIL) return "admin";
  if (normalized.endsWith(STUDENT_DOMAIN)) return "student";
  if (normalized.endsWith(TEACHER_DOMAIN)) return "teacher";

  return null;
}

export function isAuthorizedEmail(email) {
  return getRoleFromEmail(email) !== null;
}

export function isEmailAllowedForSchool(email, role, school) {
  if (role === "admin") return true;
  if (!email || !school) return false;

  const normalized = email.trim().toLowerCase();

  if (role === "student") {
    return normalized.endsWith(school.allowedStudentDomain);
  }

  if (role === "teacher") {
    return normalized.endsWith(school.allowedTeacherDomain);
  }

  return false;
}
