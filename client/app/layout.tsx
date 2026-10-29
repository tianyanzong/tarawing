import type { Metadata } from 'next';
import './globals.css';

// Deliberately minimal: no Nav/Footer here. Public-facing pages get them
// from app/(site)/layout.tsx; admin pages (app/admin/...) sit outside that
// route group and so never render the end-user site chrome.
export const metadata: Metadata = {
  title: 'Tarawing — Read the Cosmos. Find Your Path.',
  description: 'Astrology, Tarot, Lenormand, and sacred-geometry card spreads with AI-generated readings.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
