export default function LoginPage({ error, onSignIn }) {
  return (
    <main className="app-shell center-shell">
      <section className="card login-card">
        <div className="brand-mark" aria-hidden="true">
          DRR
        </div>
        <p className="eyebrow">Doral Red Rock</p>
        <h1>School Hub Access</h1>
        <p className="lede">
          Sign in with your approved Doral Google account to continue.
        </p>

        {error ? <p className="error-message">{error}</p> : null}

        <button className="primary-button google-button" onClick={onSignIn}>
          <span className="google-mark" aria-hidden="true">
            G
          </span>
          Sign in with Google
        </button>
      </section>
    </main>
  );
}
