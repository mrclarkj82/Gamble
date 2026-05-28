export default function SectionRoster({ error, isLoading, roster, section }) {
  if (!section) {
    return (
      <div className="empty-state">
        Select a section to view its roster.
      </div>
    );
  }

  return (
    <section className="roster-panel" aria-live="polite">
      <div className="section-header">
        <div>
          <p className="eyebrow">Roster</p>
          <h3>{section.sectionName}</h3>
        </div>
        <p className="code-pill">{section.classCode}</p>
      </div>

      {error ? <p className="error-message">{error}</p> : null}
      {isLoading ? <p className="helper-text neutral-helper">Loading roster...</p> : null}

      {!isLoading && !error && roster.length === 0 ? (
        <p className="empty-state">No students have joined this section yet.</p>
      ) : null}

      {!isLoading && roster.length > 0 ? (
        <div className="roster-list">
          {roster.map((student) => (
            <article className="roster-row" key={student.studentUid}>
              <div>
                <strong>{student.studentName}</strong>
                <span>{student.studentEmail}</span>
              </div>
              <p>{student.status}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
