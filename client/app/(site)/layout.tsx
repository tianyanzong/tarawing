import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { UserAuthProvider } from '@/lib/auth';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserAuthProvider>
      <Nav />
      <main>{children}</main>
      <Footer />
    </UserAuthProvider>
  );
}
