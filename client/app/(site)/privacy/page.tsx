export default function PrivacyPage() {
  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Privacy Policy</h1>
      <p className="form-note" style={{ marginBottom: 30 }}>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div style={{ lineHeight: 1.75, color: 'var(--parchment-dim)', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>What we collect</h2>
          <p>Account details (name, email, hashed password), the questions and birth details you submit for a reading, and the readings/orders tied to your account. Birth date, time, and place are used only to compute your chart and are stored against your account, never shared or sold.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>What we don't do</h2>
          <p>We don't sell your data to third parties. We don't use your birth details or questions for anything beyond generating and storing your own readings.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>AI-generated readings</h2>
          <p>When you request an AI reading, your question, drawn cards, or chart data are sent to our AI provider to generate the interpretation text. This is used only to produce your reading, not to train models on your personal data beyond the provider's standard API terms.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>Payments</h2>
          <p>Payments use QR codes configured by an administrator. Tarawing records the selected payment method, order amount, and payment status so an administrator can verify the incoming payment; it does not collect or store card numbers. Automatic confirmation depends on the payment provider or bank used outside Tarawing.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>Your controls</h2>
          <p>You can delete any saved reading from your dashboard at any time. To delete your account entirely, contact support via the email on our <a href="/faq" style={{ color: 'var(--gold-bright)' }}>FAQ page</a>.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>Cookies & sessions</h2>
          <p>We use a browser-stored login token to keep you signed in. We don't use third-party advertising trackers.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>Changes</h2>
          <p>We may update this policy as the product changes. Material changes will be reflected here with an updated date.</p>
        </section>
      </div>
    </div>
  );
}
