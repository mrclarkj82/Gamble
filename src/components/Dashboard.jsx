import { useState } from "react";
import { DASHBOARD_MESSAGES, ROLE_LABELS } from "../constants";
import AdminSections from "./AdminSections";
import StudentClasses from "./StudentClasses";
import TeacherSections from "./TeacherSections";

export default function Dashboard({ role, school, user, onSignOut }) {
  const [adminViewMode, setAdminViewMode] = useState("admin");
  const canSwitchAdminViews = role === "admin";
  const activeDashboardRole = canSwitchAdminViews ? adminViewMode : role;
  const roleLabel = ROLE_LABELS[role] || "User";
  const activeRoleLabel = ROLE_LABELS[activeDashboardRole] || "User";
  const displayName =
    role === "admin" ? "Joseph Clark" : user?.displayName || user?.email;

  return (
    <main className="app-shell dashboard-shell">
      <section className="dashboard-topbar">
        <div>
          <p className="eyebrow">Doral Red Rock</p>
          <h1>{activeRoleLabel} Dashboard</h1>
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
          {canSwitchAdminViews ? (
            <div>
              <dt>Viewing</dt>
              <dd>{activeRoleLabel}</dd>
            </div>
          ) : null}
        </dl>

        {canSwitchAdminViews ? (
          <div className="mode-switch" aria-label="Dashboard view">
            <button
              className={adminViewMode === "admin" ? "mode-button active" : "mode-button"}
              onClick={() => setAdminViewMode("admin")}
              type="button"
            >
              Admin view
            </button>
            <button
              className={
                adminViewMode === "teacher" ? "mode-button active" : "mode-button"
              }
              onClick={() => setAdminViewMode("teacher")}
              type="button"
            >
              Teacher view
            </button>
          </div>
        ) : null}

        <p className="next-step-message">
          {DASHBOARD_MESSAGES[activeDashboardRole]}
        </p>
      </section>

      {role === "student" ? (
        <StudentClasses role={role} school={school} user={user} />
      ) : null}

      {role === "teacher" || activeDashboardRole === "teacher" ? (
        <TeacherSections role={role} school={school} user={user} />
      ) : null}

      {activeDashboardRole === "admin" ? <AdminSections school={school} /> : null}
    </main>
  );
}
