import { DASHBOARD_MESSAGES, ROLE_LABELS } from "../constants";
import AdminSections from "./AdminSections";
import StudentClasses from "./StudentClasses";
import TeacherSections from "./TeacherSections";

export default function Dashboard({ role, school, user, onSignOut }) {
  const roleLabel = ROLE_LABELS[role] || "User";
  const displayName =
    role === "admin" ? "Joseph Clark" : user?.displayName || user?.email;

  return (
    <main className="app-shell dashboard-shell">
      <section className="dashboard-topbar">
        <div>
          <p className="eyebrow">Doral Red Rock</p>
          <h1>{roleLabel} Dashboard</h1>
        </div>
        <button className="secondary-button" onClick={onSignOut}>
          Sign out
        </button>
      </section>

      <section className="card dashboard-card">
        <div>
          <p className="eyebrow">Welcome</p>
          <h2>{displayName}</h2>
        </div>

        <dl className="profile-grid">
          <div>
            <dt>Role</dt>
            <dd>{roleLabel}</dd>
          </div>
          <div>
            <dt>School</dt>
            <dd>{school?.name || "Doral Red Rock"}</dd>
          </div>
        </dl>

        <p className="next-step-message">{DASHBOARD_MESSAGES[role]}</p>
      </section>

      {role === "student" ? (
        <StudentClasses role={role} school={school} user={user} />
      ) : null}

      {role === "teacher" ? (
        <TeacherSections role={role} school={school} user={user} />
      ) : null}

      {role === "admin" ? <AdminSections school={school} /> : null}
    </main>
  );
}
