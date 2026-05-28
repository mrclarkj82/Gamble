export default function LoadingScreen() {
  return (
    <main className="app-shell center-shell">
      <section className="card compact-card">
        <div className="spinner" aria-hidden="true" />
        <p className="eyebrow">Checking access</p>
        <h1>Loading your school gateway</h1>
      </section>
    </main>
  );
}
