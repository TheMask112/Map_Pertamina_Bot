// layout.tsx
// Root Layout for Bot MAP Pertamina License Web Application

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portal Lisensi Resmi Bot MAP Pertamina',
  description: 'Beli lisensi Bot MAP Pertamina secara instan dan otomatis melalui QRIS. Aktivasi cepat 24/7 tanpa antre via Telegram bot.',
  keywords: ['bot pertamina', 'map pertamina', 'lisensi pertamina', 'qris otomatis', 'aktivasi bot'],
  authors: [{ name: 'Antigravity AI Client Developer' }],
  viewport: 'width=device-width, initial-scale=1.0',
  robots: 'index, follow',
};

import { CONFIG } from '@/lib/config';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <script 
          src={CONFIG.midtrans.snapJsUrl}
          data-client-key={CONFIG.midtrans.clientKey}
          type="text/javascript"
        ></script>
      </head>
      <body>
        {/* Sticky Premium Glowing Header */}
        <header style={styles.header}>
          <div style={styles.headerContainer}>
            <a href="/" style={styles.logoGroup}>
              <div style={styles.logoBadge}>🤖</div>
              <div style={styles.logoText}>
                <span style={styles.logoMain}>MAP Pertamina</span>
                <span style={styles.logoSub}>LICENSE PORTAL</span>
              </div>
            </a>
            <nav style={styles.nav}>
              <a href="/" style={styles.navLink}>Beranda</a>
              <a href="/#pricing" style={styles.navLink}>Harga</a>
              <a href="/download#tutorial" style={styles.navLink}>📖 Tutorial</a>
              <a href="/#faq" style={styles.navLink}>FAQ</a>
              <a href="/affiliate/register" style={{ ...styles.navLink, color: '#38bdf8', fontWeight: 700 }}>🤝 Mitra Affiliate</a>
              <a href="/download" style={styles.navButton}>Unduh Bot</a>
            </nav>
          </div>
        </header>

        {/* Main Content wrapper */}
        <main style={styles.main}>
          {children}
        </main>

        {/* Premium Cyber Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContainer}>
            <div style={styles.footerSection}>
              <div style={styles.footerLogo}>🤖 MAP Pertamina Bot</div>
              <p style={styles.footerDesc}>
                Sistem aktivasi mandiri berkecepatan tinggi dengan integrasi pembayaran QRIS dinamis & Telegram Bot keygen.
              </p>
            </div>
            <div style={styles.footerSectionLinks}>
              <h4 style={styles.footerTitle}>Navigasi</h4>
              <a href="/" style={styles.footerLink}>Beranda</a>
              <a href="/#pricing" style={styles.footerLink}>Daftar Harga</a>
              <a href="/download" style={styles.footerLink}>Unduh Software</a>
              <a href="/admin" style={styles.footerLink}>Admin Portal</a>
            </div>
            <div style={styles.footerSectionLinks}>
              <h4 style={styles.footerTitle}>Mitra Reseller</h4>
              <a href="/affiliate/register" style={styles.footerLink}>Daftar Jadi Mitra</a>
              <a href="/affiliate/login" style={styles.footerLink}>Login Dashboard Mitra</a>
              <a href="/#faq" style={styles.footerLink}>Pertanyaan Populer</a>
            </div>
          </div>
          <div style={styles.footerBottom}>
            <p>&copy; {new Date().getFullYear()} Gorillaz Cafe. All Rights Reserved. Built securely for MAP Pertamina Operators.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

// Inline CSS for Next.js Layout Structure
const styles = {
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    background: 'rgba(9, 11, 15, 0.7)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    fontSize: '1.8rem',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '4px 8px',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  logoMain: {
    fontWeight: 800,
    fontSize: '1.25rem',
    letterSpacing: '-0.02em',
    color: '#ffffff',
  },
  logoSub: {
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    fontWeight: 700,
    color: 'hsl(194, 96%, 52%)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLink: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'hsl(215, 20%, 65%)',
    transition: 'all 0.2s ease',
  },
  navButton: {
    fontSize: '0.85rem',
    fontWeight: 600,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#ffffff',
    transition: 'all 0.2s ease',
  },
  main: {
    minHeight: 'calc(100vh - 80px - 280px)', // dynamic offset of header + footer
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px',
  },
  footer: {
    background: 'rgba(6, 8, 12, 0.95)',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '60px 24px 30px',
    marginTop: '60px',
  },
  footerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '40px',
    marginBottom: '40px',
  },
  footerSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  footerSectionLinks: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  footerLogo: {
    fontWeight: 800,
    fontSize: '1.2rem',
    color: '#ffffff',
  },
  footerDesc: {
    fontSize: '0.85rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.6',
  },
  footerTitle: {
    fontSize: '0.9rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#ffffff',
    marginBottom: '8px',
  },
  footerLink: {
    fontSize: '0.85rem',
    color: 'hsl(215, 20%, 65%)',
    transition: 'all 0.2s ease',
  },
  footerBottom: {
    maxWidth: '1200px',
    margin: '0 auto',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    paddingTop: '20px',
    textAlign: 'center' as const,
    fontSize: '0.8rem',
    color: 'hsl(215, 12%, 40%)',
  },
};
