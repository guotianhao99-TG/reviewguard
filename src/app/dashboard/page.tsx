'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  HelpCircle,
  Mail,
  Phone,
  RefreshCw,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { EmailSetupGuide } from './EmailSetupGuide';

interface DashboardReview {
  id: string;
  reviewer: string;
  rating: number;
  content: string;
  status: string;
  createdAt: string;
  magicLink: string | null;
}

const fallbackReviews: DashboardReview[] = [
  {
    id: 'rev-1',
    reviewer: 'James Peterson',
    rating: 1,
    content: 'Terrible customer service! The technician showed up 3 hours late and charged me $250 just to look at the furnace. When I complained, he was extremely rude...',
    status: 'drafted',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    magicLink: '/alerts/rev-1?token=simulated-demo-token',
  },
  {
    id: 'rev-2',
    reviewer: 'James Miller',
    rating: 3,
    content: 'The AC repair was done quickly and the system works fine now. However, the technician left greasy fingerprints all over our white wall in the hallway...',
    status: 'drafted',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    magicLink: '/alerts/rev-2?token=simulated-demo-token',
  },
];

export default function DashboardPage() {
  const [snapshotSource, setSnapshotSource] = useState<{ cameFromSnapshot: boolean; industry: string | null }>({
    cameFromSnapshot: false,
    industry: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>('498-382-901');
  const [recentReviews, setRecentReviews] = useState<DashboardReview[]>([]);

  const [bizName, setBizName] = useState('');
  const [gbpReviewUrl, setGbpReviewUrl] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const data = await res.json();

      setVerificationCode(data.verificationCode);
      setRecentReviews(data.recentReviews);
      setIsDemoMode(data.isDemoMode);
      setBizName(data.activeBusiness.name);
      setGbpReviewUrl(data.activeBusiness.gbpReviewUrl);
      setOwnerName(data.activeBusiness.ownerName);
      setOwnerEmail(data.activeBusiness.ownerEmail);
      setOwnerPhone(data.activeBusiness.ownerPhone);
    } catch (err) {
      console.warn('Dashboard data fetch failed, using local demo settings:', err);
      setIsDemoMode(true);
      setRecentReviews(fallbackReviews);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSnapshotSource({
      cameFromSnapshot: params.get('source') === 'snapshot',
      industry: params.get('industry'),
    });
    loadDashboardData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bizName,
          gbpReviewUrl,
          ownerName,
          ownerEmail,
          ownerPhone,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      await loadDashboardData();
      alert('Settings saved.');
    } catch {
      alert('Settings saved for this local demo session.');
    } finally {
      setIsSaving(false);
    }
  };

  const reviewForwardingAddress = 'guotianhao99@gmail.com';
  const activityItems = useMemo(() => recentReviews.slice(0, 5), [recentReviews]);
  const lowStarCount = recentReviews.filter((review) => review.rating <= 3).length;
  const needsActionCount = recentReviews.filter((review) => review.status !== 'copied').length;

  const renderStars = (rating: number) => (
    <span style={{ display: 'inline-flex', gap: '2px' }} aria-label={`${rating} star rating`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < rating ? '#f59e0b' : '#d1d5db', fontSize: '14px', lineHeight: 1 }}>
          ★
        </span>
      ))}
    </span>
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '15px' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: '#2563eb' }} />
        <p style={{ color: '#4b5563', fontSize: '15px', fontWeight: 600 }}>Loading setup dashboard...</p>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '36px 20px 64px' }}>
      {isDemoMode && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '14px 16px', borderRadius: '8px', color: '#92400e', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '22px' }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>Demo mode</h4>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
              Local demo data is active. Simulator events created during this dev-server session will appear in Recent Activity.
            </p>
          </div>
        </div>
      )}

      {snapshotSource.cameFromSnapshot && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px 16px', borderRadius: '8px', color: '#1e40af', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '22px' }}>
          <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>Snapshot converted into setup</h4>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
              You came from the {snapshotSource.industry || 'local service'} snapshot. Finish forwarding setup here, then every future review alert goes straight to a Magic Link.
            </p>
          </div>
        </div>
      )}

      <div className="rg-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>
            <ShieldCheck size={16} />
            Setup
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 850, color: '#111827', margin: '0 0 6px', lineHeight: 1.15 }}>
            ReviewGuard Dashboard Setup
          </h1>
          <p style={{ color: '#4b5563', margin: 0, fontSize: '16px', maxWidth: '760px', lineHeight: 1.5 }}>
            Configure your business details and email forwarding to activate automated review drafts.
          </p>
        </div>
      </div>

      <div className="rg-flow-strip" aria-label="ReviewGuard onboarding flow">
        <div><span>1</span> Snapshot</div>
        <div><span>2</span> Dashboard Setup</div>
        <div><span>3</span> Review Email Arrives</div>
        <div><span>4</span> Magic Link Reply</div>
      </div>

      <div className="rg-dashboard-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', gap: '24px', alignItems: 'start', marginTop: '24px' }}>
        <section className="rg-card" style={{ borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Mail style={{ color: '#2563eb' }} size={24} />
            <div>
              <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: '13px', fontWeight: 800 }}>Setup step</p>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#111827', lineHeight: 1.2 }}>Email Forwarding Setup</h2>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>
              Forward review emails to this ReviewGuard intake address:
            </p>
            <div className="rg-copy-field">
              <input
                type="text"
                readOnly
                value={reviewForwardingAddress}
                className="rg-input"
                style={{ backgroundColor: '#f9fafb', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700 }}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(reviewForwardingAddress);
                  alert('Forwarding address copied.');
                }}
                className="rg-btn-secondary"
                title="Copy forwarding address"
                style={{ padding: '10px' }}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <EmailSetupGuide forwardingAddress={reviewForwardingAddress} />

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: '#111827' }}>Gmail Confirmation Code</h3>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>
              If you use Gmail, ReviewGuard watches for their confirmation email and extracts the code here.
            </p>

            {verificationCode ? (
              <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#065f46', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                    Code detected
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: 850, fontFamily: 'monospace', color: '#111827', letterSpacing: '1px' }}>
                    {verificationCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(verificationCode.replace(/-/g, ''));
                    alert('Confirmation code copied.');
                  }}
                  className="rg-btn-primary"
                  style={{ backgroundColor: '#059669', flexShrink: 0 }}
                >
                  Copy Code
                </button>
              </div>
            ) : (
              <div style={{ backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', padding: '18px', borderRadius: '8px', color: '#6b7280' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Waiting for confirmation email.</p>
              </div>
            )}
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <section className="rg-card">
            <h2 style={{ margin: '0 0 10px', fontSize: '20px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={21} style={{ color: '#2563eb' }} /> System Status
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }} className="rg-alert-stats">
              <div style={{ border: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderRadius: '8px', padding: '14px' }}>
                <span style={{ display: 'block', fontSize: '26px', fontWeight: 850, color: '#991b1b', lineHeight: 1 }}>{lowStarCount}</span>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7f1d1d', marginTop: '6px' }}>Low-star reviews</span>
              </div>
              <div style={{ border: '1px solid #dbeafe', backgroundColor: '#eff6ff', borderRadius: '8px', padding: '14px' }}>
                <span style={{ display: 'block', fontSize: '26px', fontWeight: 850, color: '#1d4ed8', lineHeight: 1 }}>{needsActionCount}</span>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e3a8a', marginTop: '6px' }}>Recent items</span>
              </div>
            </div>
            <Link href="/debug/simulator" style={{ textDecoration: 'none', width: '100%', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', display: 'flex', justifyContent: 'center', padding: '10px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', alignItems: 'center', gap: '8px' }}>
              Test the alert flow <ArrowRight size={16} />
            </Link>
          </section>

          <details className="rg-card">
            <summary style={{ cursor: 'pointer', fontWeight: 850, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Settings
            </summary>
            <p style={{ color: '#6b7280', margin: '12px 0 18px', fontSize: '14px', lineHeight: 1.5 }}>
              Configure your business details.
            </p>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                Business Name
                <input type="text" className="rg-input" value={bizName} onChange={(e) => setBizName(e.target.value)} />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                Google Review URL
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Globe size={18} style={{ color: '#9ca3af', position: 'absolute', marginLeft: '12px' }} />
                  <input type="text" className="rg-input" style={{ paddingLeft: '38px' }} value={gbpReviewUrl} onChange={(e) => setGbpReviewUrl(e.target.value)} />
                </span>
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                Owner Name
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <User size={18} style={{ color: '#9ca3af', position: 'absolute', marginLeft: '12px' }} />
                  <input type="text" className="rg-input" style={{ paddingLeft: '38px' }} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </span>
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                Alert Email
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Mail size={18} style={{ color: '#9ca3af', position: 'absolute', marginLeft: '12px' }} />
                  <input type="email" className="rg-input" style={{ paddingLeft: '38px' }} value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                </span>
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                Owner Phone
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Phone size={18} style={{ color: '#9ca3af', position: 'absolute', marginLeft: '12px' }} />
                  <input type="text" className="rg-input" style={{ paddingLeft: '38px' }} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                </span>
              </label>

              <button type="submit" disabled={isSaving} className="rg-btn-primary">
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </details>
        </aside>
      </div>

      <section className="rg-card" style={{ marginTop: '24px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', borderBottom: '1px solid #e5e7eb' }} className="rg-activity-header">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
              <CheckCircle2 size={16} />
              Recent Activity
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#111827', lineHeight: 1.2 }}>Last 5 review events</h2>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px', lineHeight: 1.5 }}>
              This is only a lightweight history. Use Magic Link for reply drafting and copying.
            </p>
          </div>
          <Link href="/snapshot/plumbing" className="rg-btn-secondary" style={{ textDecoration: 'none', flexShrink: 0 }}>
            View Snapshot <ExternalLink size={16} />
          </Link>
        </div>

        {activityItems.length === 0 ? (
          <div style={{ padding: '32px 24px', color: '#6b7280', backgroundColor: '#f9fafb' }}>
            <p style={{ margin: 0, fontWeight: 800, color: '#111827' }}>No review activity yet.</p>
            <p style={{ margin: '6px 0 0', fontSize: '14px' }}>Run the simulator or finish Gmail forwarding to create the first Magic Link.</p>
          </div>
        ) : (
          <div>
            {activityItems.map((review, index) => (
              <div
                key={review.id}
                className="rg-alert-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(160px, 220px) minmax(0, 1fr) auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderBottom: index === activityItems.length - 1 ? 'none' : '1px solid #f3f4f6',
                  backgroundColor: index === 0 ? '#fff7ed' : '#ffffff',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 850, color: '#111827' }}>{review.reviewer}</span>
                    {index === 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#9a3412', backgroundColor: '#ffedd5', border: '1px solid #fed7aa', borderRadius: '999px', padding: '3px 8px' }}>
                        Newest
                      </span>
                    )}
                  </div>
                  {renderStars(review.rating)}
                </div>

                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 5px', color: '#374151', fontSize: '13px', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {review.content || '[No review text provided]'}
                  </p>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
                    {new Date(review.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <Link href={review.magicLink || `/alerts/${review.id}`} className="rg-btn-secondary rg-alert-action" style={{ padding: '8px 12px', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Open Magic Link <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ marginTop: '22px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <HelpCircle size={18} style={{ color: '#6b7280', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, color: '#6b7280', fontSize: '13px', lineHeight: 1.5 }}>
          Daily owner workflow: email alert arrives, owner opens Magic Link, chooses a tone, copies the reply, then posts it in Google Business Profile.
        </p>
      </div>
    </main>
  );
}
