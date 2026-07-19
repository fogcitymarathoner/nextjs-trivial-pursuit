// app/page.tsx
const Home = () => {
  return (
    <main className="app-page">
      <div className="app-container">
        <header className="page-heading">
          <h1 className="page-title text-blue-600">If this is blue and big, Tailwind is working!</h1>
          <p className="page-description">
            Shared global styling is active across the app.
          </p>
        </header>

        <section className="surface-panel surface-panel-spacious surface-panel-compact">
          <p className="body-copy">
            Use these global page, panel, form, and content classes when adding new routes.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Home;
