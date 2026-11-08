'use client';

import { AdminAuthProvider, UserWorkspaceGuard } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <UserWorkspaceGuard>{children}</UserWorkspaceGuard>
    </AdminAuthProvider>
  );
}
