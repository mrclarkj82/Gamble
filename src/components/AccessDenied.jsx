export default function AccessDenied({ email, onSignOut }) {
  return (
    <main className="app-shell center-shell">
      <section className="card compact-card">
        <p className="eyebrow danger">Access denied</p>
        <h1>This account is not authorized</h1>
        <p className="lede">
          {email
            ? `${email} is not in an accepted Doral Red Rock domain.`
            : "This Google account is not in an accepted Doral Red Rock domain."}
        </p>
        <p className="helper-text">
          Use a student, teacher, or approved admin account to enter.
        </p>
        <button className="secondary-button" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  );
}
