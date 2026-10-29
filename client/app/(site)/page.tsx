import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <div>
          <div className="hero-eyebrow">ASTROWING · TARAWING</div>
          <h1>Read the Cosmos. Find Your Path.</h1>
          <p className="hero-lede">
            The cosmos reveals the patterns. The cards reveal the possibilities.
            Draw a spread, cast your chart, or ask a direct question — Tarawing
            turns the answer into a reading written for you, not templated for anyone.
          </p>
          <div className="hero-actions">
            <Link href="/tarot" className="btn btn-primary">Draw a card</Link>
            <Link href="/astrology" className="btn btn-ghost">Cast my chart</Link>
          </div>
          <div className="trust-bar">
            <div className="trust-item"><span className="dot" />No account needed to draw</div>
            <div className="trust-item"><span className="dot" />Birth data never shared</div>
            <div className="trust-item"><span className="dot" />Written fresh, not templated</div>
          </div>
        </div>
        <div className="orbit" aria-hidden="true">
          <div className="orbit-ring orbit-ring--1" />
          <div className="orbit-ring orbit-ring--2" />
          <div className="orbit-ring orbit-ring--3" />
          <div className="orbit-core" />
          <div className="orbit-node" style={{ top: '2%', left: '50%', transform: 'translate(-50%,0)' }}>Cosmic Engine</div>
          <div className="orbit-node" style={{ bottom: '10%', left: '4%' }}>Oracle Engine</div>
          <div className="orbit-node" style={{ bottom: '10%', right: '4%' }}>Sacred Layout</div>
        </div>
      </section>

      <section className="section">
        <div className="panel-spotlight">
          <span className="spotlight-word">Hello,</span>
          <p>
            I&apos;m Tarawing — part star chart, part card table. Ask me a real
            question, tell me when and where you were born, and I&apos;ll turn
            the pattern in the cards or the sky into a reading written for
            the moment you&apos;re actually in.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Three engines, one question</h2>
        <div className="divider-flourish">✦</div>
        <p className="section-lede">
          Tarawing groups nine tools into three dashboards — pick the one that
          matches how you want your answer: mapped against time, drawn from a
          deck, or laid out in a fixed geometry.
        </p>
        <div className="engine-grid">
          <div className="engine-cell">
            <div className="badge-ring">🪐</div>
            <h3 style={{ textAlign: 'center' }}>The Cosmic Engine</h3>
            <p className="form-note" style={{ textAlign: 'center' }}>Time-based, macro guidance from your birth data.</p>
            <ul>
              <li><Link href="/astrology">Western Astrology — Natal Chart</Link></li>
              <li><Link href="/astrology?mode=seven_planets">Seven Planets Layout</Link></li>
            </ul>
          </div>
          <div className="engine-cell">
            <div className="badge-ring">🃏</div>
            <h3 style={{ textAlign: 'center' }}>The Oracle Engine</h3>
            <p className="form-note" style={{ textAlign: 'center' }}>Card selection, no fixed geometry.</p>
            <ul>
              <li><Link href="/tarot?deck=tarot">Tarot Cards</Link></li>
              <li><Link href="/tarot?deck=playing_cards">Playing Card Divination</Link></li>
            </ul>
          </div>
          <div className="engine-cell">
            <div className="badge-ring">🔮</div>
            <h3 style={{ textAlign: 'center' }}>The Sacred Layout Engine</h3>
            <p className="form-note" style={{ textAlign: 'center' }}>Pair readings and geometry-based spreads in fixed positions.</p>
            <ul>
              <li><Link href="/spreads?type=lenormand_pair">Lenormand Pair (2 cards)</Link></li>
              <li><Link href="/spreads?type=holy_triangle">Holy Triangle (3 cards)</Link></li>
              <li><Link href="/spreads?type=gypsy_cross">Gypsy Cross (5 cards)</Link></li>
              <li><Link href="/spreads?type=hexagram">Hexagram Spread (7 cards)</Link></li>
              <li><Link href="/spreads?type=solomon_star">Star of Solomon (8 cards)</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
