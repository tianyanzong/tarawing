'use client';
import { AdminGuard } from '@/lib/auth';
import AdminShell from './AdminShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
