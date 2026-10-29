'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/lib/auth';
import BrandLogo from './BrandLogo';

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" />
    </svg>
  );
}

export default function Nav() {
  const router = useRouter();
  const { status, signOut } = useUserAuth();

  return (
    <div className="site-nav-outer">
      <nav className="site-nav">
        <Link href="/" className="brand" aria-label="Tarawing home">
          <BrandLogo variant="horizontal" priority />
        </Link>
        <div className="nav-links">
          <Link href="/astrology">Astrology</Link>
          <Link href="/tarot">Tarot</Link>
          <Link href="/spreads">Spreads</Link>
          <Link href="/library">Library</Link>
          <Link href="/faq">FAQ</Link>
          {status === 'loading' ? (
            <span className="nav-auth-pending" aria-label="Checking session" />
          ) : status === 'authenticated' ? (
            <>
              <Link href="/dashboard" className="nav-avatar" aria-label="Your dashboard" title="Your dashboard">
                <UserIcon />
              </Link>
              <button
                className="btn btn-ghost nav-logout"
                onClick={() => { signOut(); router.replace('/'); }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="nav-cta">Sign in</Link>
          )}
        </div>
      </nav>
    </div>
  );
}
