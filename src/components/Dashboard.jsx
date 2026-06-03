import { DASHBOARD_MESSAGES, ROLE_LABELS } from "../constants";
import AdminSections from "./AdminSections";
import StudentClasses from "./StudentClasses";
import TeacherSections from "./TeacherSections";
import { useState } from "react";

export default function Dashboard({ role, school, user, onSignOut }) {
  const [adminView, setAdminView] = useState("admin");
  const effectiveView = role === "admin" ? adminView : role;
  const roleLabel = ROLE_LABELS[role] || "User";
  const viewingLabel = ROLE_LABELS[effectiveView] || roleLabel;
  const displayName =
    role === "admin" ? "Joseph Clark" : user?.displayName || user?.email;
  const message =
    role === "admin" && effectiveView === "teacher"
      ? DASHBOARD_MESSAGES.teacher
      : DASHBOARD_MESSAGES[role];

  return (
    <main className="app-shell dashboard-shell">
      <section className="dashboard-topbar">
        <div>
          <p className="eyebrow">Doral Red Rock</p>
          <h1>{viewingLabel} Dashboard</h1>
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
          {role === "admin" ? (
            <div>
              <dt>Viewing</dt>
              <dd>{viewingLabel}</dd>
            </div>
          ) : null}
        </dl>

        {role === "admin" ? (
          <div className="view-toggle" aria-label="Dashboard view">
            <button
              className={adminView === "admin" ? "active" : ""}
              onClick={() => setAdminView("admin")}
              type="button"
            >
              Admin view
            </button>
            <button
              className={adminView === "teacher" ? "active" : ""}
              onClick={() => setAdminView("teacher")}
              type="button"
            >
              Teacher view
            </button>
          </div>
        ) : null}

        <p className="next-step-message">{message}</p>
      </section>

      {effectiveView === "student" ? (
        <StudentClasses role={role} school={school} user={user} />
      ) : null}

      {effectiveView === "teacher" ? (
        <TeacherSections role={role} school={school} user={user} />
      ) : null}

      {effectiveView === "admin" ? (
        <AdminSections role={role} school={school} user={user} />
      ) : null}
    </main>
  );
}
