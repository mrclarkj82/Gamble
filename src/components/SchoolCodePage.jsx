import { useState } from "react";

export default function SchoolCodePage({
  displayName,
  email,
  error,
  isVerifying,
  onSubmit,
  onSignOut,
}) {
  const [schoolCode, setSchoolCode] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(schoolCode);
  }

  return (
    <main className="app-shell center-shell">
      <section className="card code-card">
        <p className="eyebrow">Verified Google account</p>
        <h1>Enter your school code</h1>
        <p className="lede">
          Welcome, {displayName || email}. Add the Doral Red Rock code to finish
          setup.
        </p>

        <form className="school-code-form" onSubmit={handleSubmit}>
          <label htmlFor="school-code">School code</label>
          <input
            id="school-code"
            autoComplete="one-time-code"
            inputMode="text"
            maxLength="24"
            onChange={(event) => setSchoolCode(event.target.value)}
            placeholder="DRR2026"
            value={schoolCode}
          />

          {error ? <p className="error-message">{error}</p> : null}

          <button
            className="primary-button"
            disabled={isVerifying || !schoolCode.trim()}
            type="submit"
          >
            {isVerifying ? "Checking code..." : "Verify school code"}
          </button>
        </form>

        <button className="text-button" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  );
}
