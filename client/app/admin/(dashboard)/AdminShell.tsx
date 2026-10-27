'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { hasPerm, useAdminAuth } from '@/lib/auth';
import BrandLogo from '@/components/BrandLogo';

const NAV: { href: string; label: string; perm?: string }[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users', perm: 'users' },
  { href: '/admin/orders', label: 'Orders', perm: 'orders' },
  { href: '/admin/readings', label: 'Readings', perm: 'readings' },
  { href: '/admin/deep-insights', label: 'Deep Insights Queue', perm: 'readings' },
  { href: '/admin/consultations', label: 'Consultations', perm: 'consults' },
  { href: '/admin/content', label: 'Content & FAQ', perm: 'content' },
  { href: '/admin/settings', label: 'Settings', perm: 'settings' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { session: admin, signOut } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <BrandLogo variant="square" priority />
          <div>
            <div className="admin-brand__title">TaraWing Admin</div>
            <div className="form-note">{admin?.username} · {admin?.role}</div>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.filter((n) => !n.perm || hasPerm(admin, n.perm)).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`admin-nav__link${pathname === n.href ? ' is-active' : ''}`}
            >
              {n.label}
            </Link>
          ))}
          {admin?.isSuper && (
            <Link
              href="/admin/admins"
              className={`admin-nav__link${pathname === '/admin/admins' ? ' is-active' : ''}`}
            >
              Admin accounts
            </Link>
          )}
        </nav>
        <button
          className="btn btn-ghost admin-signout"
          onClick={() => { signOut(); router.push('/admin/login'); }}
        >
          Sign out
        </button>
      </aside>
      <div>{children}</div>
    </div>
  );
}
