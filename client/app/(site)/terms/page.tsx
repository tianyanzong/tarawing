export default function TermsPage() {
  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Terms of Service</h1>
      <p className="form-note" style={{ marginBottom: 30 }}>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div style={{ lineHeight: 1.75, color: 'var(--parchment-dim)', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>1. What TaraWing is</h2>
          <p>TaraWing provides astrology, tarot, and card-based readings for entertainment, reflection, and self-exploration. Readings are generated from astronomical calculations, traditional card meanings, and AI-written interpretation — they are not professional advice of any kind.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>2. Not medical, legal, or financial advice</h2>
          <p>Nothing on TaraWing is a substitute for advice from a qualified doctor, therapist, lawyer, or financial professional. Do not use a reading as the basis for a medical, legal, or financial decision. If you are in crisis, please contact a local emergency service or crisis line rather than relying on this site.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>3. Accounts</h2>
          <p>You are responsible for keeping your login credentials secure and for the accuracy of the birth details and questions you submit. You may delete your saved readings at any time from your dashboard.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>4. Purchases</h2>
          <p>Paid unlocks (detailed interpretations, chart reports) are one-time purchases tied to a specific reading. Refund requests are handled case by case — contact support using the email in our Settings/FAQ pages.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>5. Acceptable use</h2>
          <p>Don't use TaraWing to harass, defraud, or make decisions on behalf of someone else without their knowledge. Don't attempt to scrape, resell, or automate bulk access to readings or card/chart data without permission.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>6. Changes</h2>
          <p>We may update these terms as the product changes. Continued use after an update means you accept the revised terms.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 19, color: 'var(--parchment)', marginBottom: 10 }}>7. Contact</h2>
          <p>Questions about these terms can be sent to the support address listed on our <a href="/faq" style={{ color: 'var(--gold-bright)' }}>FAQ page</a>.</p>
        </section>
      </div>
    </div>
  );
}
