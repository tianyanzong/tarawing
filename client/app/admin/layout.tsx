import { AdminAccessGate, AdminAuthProvider } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminAccessGate>{children}</AdminAccessGate>
    </AdminAuthProvider>
  );
}
