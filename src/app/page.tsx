import React from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, ArrowUpRight, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'ReviewGuard - Google Low-Star Review Alert & AI Response Assistant',
  description: 'Catch damaging Google reviews fast and reply professionally without logging into another dashboard.',
};

export default function WelcomePage() {
  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Header */}
      <header style={{ borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={26} style={{ color: '#2563eb' }} />
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>
            ReviewGuard
          </span>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <Link href="/dashboard" className="rg-btn-secondary" style={{ padding: '8px 16px', fontSize: '14px', textDecoration: 'none' }}>
            Dashboard
          </Link>
          <Link href="/debug/simulator" className="rg-btn-primary" style={{ padding: '8px 16px', fontSize: '14px', textDecoration: 'none' }}>
            Simulator
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 14px', borderRadius: '9999px', fontSize: '13px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
          <Zap size={14} fill="#2563eb" /> V1 Demo / Concierge-ready MVP
        </span>

        <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#111827', margin: '0 0 15px 0', letterSpacing: '-1px', lineHeight: '1.1' }}>
          Google Low-Star Alert + Professional Response Drafts
        </h1>
        
        <p style={{ color: '#4b5563', fontSize: '18px', lineHeight: '1.6', margin: '0 0 35px 0', maxWidth: '640px' }}>
          Never let negative Google reviews sit unanswered on your business profile. Catch them in minutes via email alerts and respond with compliant, professional drafts without another complex dashboard to learn.
        </p>

        {/* Action Button Grid */}
        <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', marginBottom: '50px' }}>
          <Link href="/dashboard" className="rg-btn-primary" style={{ padding: '14px 28px', fontSize: '16px', textDecoration: 'none' }}>
            Open Controls Dashboard <ArrowRight size={18} />
          </Link>
          <Link href="/snapshot/hvac" className="rg-btn-secondary" style={{ padding: '14px 28px', fontSize: '16px', textDecoration: 'none' }}>
            View Cold Outreach Demo <ArrowUpRight size={18} />
          </Link>
        </div>

        {/* High Level Metrics snapshot */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', width: '100%', borderTop: '1px solid #e5e7eb', paddingTop: '40px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '32px', fontWeight: '800', color: '#2563eb' }}>2 min</span>
            <span style={{ display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>
              Average Alert Time
            </span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '32px', fontWeight: '800', color: '#16a34a' }}>100%</span>
            <span style={{ display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>
              Brand Safe Replies
            </span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '32px', fontWeight: '800', color: '#111827' }}>Zero</span>
            <span style={{ display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>
              Complex Setup Required
            </span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '24px 20px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
          &copy; {new Date().getFullYear()} ReviewGuard. Built for home service plumbers, roofers, HVAC, locksmiths, and electricians.
        </p>
      </footer>

    </div>
  );
}
