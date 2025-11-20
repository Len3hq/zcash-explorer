export default function Loading() {
  return (
    <main className="container wide-layout">
      <section className="card">
        <div className="card-header">
          <div className="section-title">Loading…</div>
          <span className="card-subtext">Fetching data from the Zcash node and external APIs.</span>
        </div>
        <p className="muted">This may take a few seconds on first load.</p>
      </section>
    </main>
  );
}
