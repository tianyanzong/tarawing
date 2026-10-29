export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span>© {new Date().getFullYear()} Tarawing — for reflection, not certainty.</span>
        <div style={{ display: 'flex', gap: 18 }}>
          <a href="/faq">FAQ</a>
          <a href="/library">Library</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
