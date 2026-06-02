'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Copy, Mail, ShieldCheck, Star, Zap } from 'lucide-react';

interface SnapshotPageProps {
  params: Promise<{ industry: string }> | { industry: string };
}

interface MockOutreachData {
  category: string;
  audience: string;
  reviewer: string;
  rating: number;
  reviewText: string;
  businessName: string;
  professional: string;
  warm: string;
  short: string;
}

const OUTREACH_TEMPLATES: Record<string, MockOutreachData> = {
  plumbing: {
    category: 'Plumbing',
    audience: 'local plumbers',
    reviewer: 'David K.',
    rating: 1,
    reviewText: 'Called them for an emergency toilet leak. The technician arrived late, left water all over my bathroom floor, and charged me $320 just to tighten a single bolt. When I asked him to clean up, he claimed it was not his job. Very disappointed in their service!',
    businessName: 'RapidPlumb Emergency Plumbers',
    professional: 'Dear David,\n\nThank you for sharing your experience with us. We hold our plumbing technicians to high standards, and we are disappointed to hear that our service fell short. We want to investigate this issue immediately. Please call our general manager directly at (555) 309-8800 so we can address your billing and service concerns.\n\nSincerely,\nRapidPlumb Management Team',
    warm: 'Hi David,\n\nWe are truly sorry to hear this was your experience. We care deeply about our service and we would like to look into what happened and help resolve it directly. Please contact our owner at (555) 309-8800 at your earliest convenience so we can make this right.\n\nWarm regards,\nRapidPlumb Team',
    short: 'Hello David,\n\nThank you for your feedback. We would like to learn more about what happened and resolve this directly with you. Please call us directly at (555) 309-8800 so we can assist you.\n\nBest,\nRapidPlumb Plumbers',
  },
  locksmith: {
    category: 'Locksmith',
    audience: 'emergency locksmiths',
    reviewer: 'Robert H.',
    rating: 2,
    reviewText: 'Locked myself out of my apartment at 10 PM. They quoted me $85 on the phone. After the locksmith drilled the lock in 5 minutes, he demanded $285 saying emergency hours and drilling fees apply. Felt like a total bait and switch. Be careful!',
    businessName: 'Express Lock & Key Services',
    professional: 'Dear Robert,\n\nThank you for your feedback. We strive for transparent pricing in all lockout scenarios, and we regret any communication gaps regarding our off-hours rates. We would appreciate the opportunity to review your invoice. Please contact our support team at (555) 720-4100 so we can look into this directly.\n\nSincerely,\nExpress Lock & Key Support',
    warm: 'Hi Robert,\n\nWe are very sorry to hear this was your experience. We take pride in honest service, and we would like to look into what happened with your technician and help resolve it directly. Please call our office at (555) 720-4100 so we can connect.\n\nWarm regards,\nExpress Lock & Key',
    short: 'Hello Robert,\n\nThank you for bringing this rate concern to our attention. We want to review this with you directly. Please contact our office manager at (555) 720-4100 at your earliest convenience.\n\nBest,\nExpress Locksmith',
  },
  roofing: {
    category: 'Roofing',
    audience: 'roofing contractors',
    reviewer: 'Melissa T.',
    rating: 1,
    reviewText: 'Hired them to repair a minor leak after the storm. They charged $1,200, but the very next rainstorm the roof leaked in the exact same spot, ruining my bedroom ceiling plaster. They have ignored my phone calls for a week now. Unacceptable!',
    businessName: 'Apex Storm Roofing Specialists',
    professional: 'Dear Melissa,\n\nThank you for bringing this to our attention. We back our roof repairs with service warranties, and we are concerned to hear about the ongoing leak. We want to dispatch a senior estimator to inspect the issue immediately. Please call our scheduling office at (555) 980-6200 so we can arrange a visit.\n\nSincerely,\nApex Roofing Management',
    warm: 'Hi Melissa,\n\nWe are deeply sorry to hear about the leak and the lack of communication. We value our craftsmanship, and we would like to look into what happened and help resolve it directly. Please call our owner at (555) 980-6200 at your convenience.\n\nWarm regards,\nApex Roofing',
    short: 'Hello Melissa,\n\nThank you for your feedback. We take warranty repair requests very seriously and want to inspect this immediately. Please contact our customer relations team at (555) 980-6200.\n\nBest,\nApex Roofing Team',
  },
  hvac: {
    category: 'HVAC',
    audience: 'HVAC companies',
    reviewer: 'James Peterson',
    rating: 1,
    reviewText: 'Terrible customer service! The technician showed up 3 hours late and charged me $250 just to look at the furnace. When I complained, he was extremely rude and told me to find someone else if I did not like the price. Avoid this HVAC company at all costs!',
    businessName: 'CoolAir Heating & Cooling',
    professional: 'Dear James,\n\nThank you for sharing your feedback with us. We take our service quality very seriously, and we are disappointed to hear that your experience did not meet expectations. We would appreciate the opportunity to investigate this issue further and work toward a direct resolution. Please call our owner Sarah Jenkins at (555) 123-4567 so we can discuss the details of your visit.\n\nSincerely,\nCoolAir Heating & Cooling Management Team',
    warm: 'Hi James,\n\nWe are truly sorry to hear this was your experience. We would like to look into what happened and help resolve it directly. Please contact our owner Sarah Jenkins at (555) 123-4567 at your earliest convenience so we can discuss this with you directly.\n\nWarm regards,\nCoolAir Heating & Cooling Management',
    short: 'Hello James,\n\nThank you for your feedback. We would like to learn more about what happened and resolve this directly with you. Please call Sarah Jenkins at (555) 123-4567 so we can assist you.\n\nBest,\nCoolAir Heating & Cooling',
  },
};

export default function SnapshotPage({ params }: SnapshotPageProps) {
  const resolvedParams = React.use(params as any) as any;
  const industry = (resolvedParams.industry || 'hvac').toLowerCase();
  const data = OUTREACH_TEMPLATES[industry] || OUTREACH_TEMPLATES.hvac;

  const [activeTone, setActiveTone] = useState<'professional' | 'warm' | 'short'>('professional');
  const [copied, setCopied] = useState(false);
  const [onboardEmail, setOnboardEmail] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(data[activeTone]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardEmail.trim()) return;
    setIsOnboarding(true);
    const target = `/dashboard?source=snapshot&industry=${encodeURIComponent(industry)}&email=${encodeURIComponent(onboardEmail)}`;
    setTimeout(() => {
      window.location.href = target;
    }, 500);
  };

  return (
    <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '38px 20px 72px' }}>
      <section className="rg-snapshot-hero">
        <div>
          <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={16} fill="#2563eb" /> ReviewGuard Snapshot
          </span>
          <h1 style={{ fontSize: '40px', lineHeight: 1.08, fontWeight: 850, color: '#111827', margin: '0 0 12px' }}>
            A reputation snapshot for {data.audience}
          </h1>
          <p style={{ color: '#4b5563', margin: 0, fontSize: '17px', lineHeight: 1.55, maxWidth: '680px' }}>
            Show the owner what happens when a low-star Google review arrives, then move them into setup so future alerts go straight to Magic Link.
          </p>
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 850, color: '#2563eb', display: 'block', lineHeight: 1 }}>&lt; 5 mins</span>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 700, marginTop: '6px', display: 'block' }}>Avg. Reply Time</span>
            </div>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 850, color: '#16a34a', display: 'block', lineHeight: 1 }}>+34%</span>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 700, marginTop: '6px', display: 'block' }}>Positive Review Rate</span>
            </div>
          </div>
        </div>
        <div className="rg-snapshot-flow" aria-label="Cold start onboarding flow">
          <div><span>1</span> Snapshot</div>
          <div><span>2</span> Dashboard Setup</div>
          <div><span>3</span> Email Alert</div>
          <div><span>4</span> Magic Link</div>
        </div>
      </section>

      <div className="rg-snapshot-grid">
        <section style={{ display: 'flex', flexDirection: 'column', gap: '18px', justifyContent: 'space-between' }}>
          <div className="rg-card" style={{ borderTop: '4px solid #dc2626' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 850, color: '#dc2626', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                Example low-star review
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>{data.category}</span>
            </div>

            <h2 style={{ fontSize: '19px', fontWeight: 850, color: '#111827', margin: '0 0 4px' }}>
              {data.reviewer} <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '14px' }}>left a review on Google</span>
            </h2>

            <div className="rg-star-rating" style={{ marginBottom: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={17} className={i < data.rating ? 'rg-star-filled' : 'rg-star-empty'} />
              ))}
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderLeft: '3px solid #dc2626', padding: '14px 15px', borderRadius: '6px' }}>
              <p style={{ margin: 0, fontStyle: 'italic', color: '#374151', fontSize: '14px', lineHeight: 1.55 }}>
                "{data.reviewText}"
              </p>
            </div>
          </div>

          <div className="rg-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }} className="rg-activity-header">
              <div>
                <span style={{ fontSize: '12px', fontWeight: 850, color: '#4b5563', textTransform: 'uppercase' }}>
                  Magic Link preview
                </span>
                <h2 style={{ margin: '5px 0 0', fontSize: '20px', color: '#111827' }}>Ready-to-copy reply drafts</h2>
              </div>

              <div style={{ display: 'flex', gap: '6px' }} className="rg-mini-tone-selector">
                {(['professional', 'warm', 'short'] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => {
                      setActiveTone(tone);
                      setCopied(false);
                    }}
                    style={{
                      padding: '6px 9px',
                      fontSize: '12px',
                      backgroundColor: activeTone === tone ? '#2563eb' : '#f3f4f6',
                      color: activeTone === tone ? '#ffffff' : '#374151',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    {tone === 'professional' ? 'Pro' : tone === 'warm' ? 'Warm' : 'Short'}
                  </button>
                ))}
              </div>
            </div>

            <pre style={{ margin: '0 0 18px', padding: '15px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '14px', lineHeight: 1.55, color: '#374151' }}>
              {data[activeTone]}
            </pre>

            <button onClick={handleCopyDraft} className="rg-btn-primary" style={{ width: '100%', backgroundColor: copied ? '#16a34a' : '#2563eb' }}>
              {copied ? (
                <>
                  <Check size={16} /> Copied
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy Draft Reply
                </>
              )}
            </button>
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '18px', justifyContent: 'space-between' }}>
          <div className="rg-card" style={{ border: '2px solid #2563eb' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 850, color: '#111827', margin: '0 0 10px' }}>
              Turn this snapshot into live protection
            </h2>
            <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: 1.6, margin: '0 0 20px' }}>
              ReviewGuard does not ask the owner to learn a queue. They finish setup once, then every important review arrives as a private Magic Link.
            </p>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '22px' }}>
              {[
                'Connect Gmail forwarding in the Dashboard',
                'Receive Google review emails automatically',
                'Open one Magic Link per review',
                'Choose a tone, copy, and reply in Google',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', gap: '9px', alignItems: 'center', fontSize: '14px', color: '#374151', fontWeight: 700 }}>
                  <CheckCircle2 size={17} style={{ color: '#16a34a', flexShrink: 0 }} /> {item}
                </div>
              ))}
            </div>

            <form onSubmit={handleOnboardSubmit} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '18px' }}>
              <h3 style={{ margin: '0 0 8px', fontWeight: 850, color: '#111827', fontSize: '16px' }}>
                Continue to Dashboard Setup
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#6b7280', lineHeight: 1.45 }}>
                Enter the owner email to carry this cold-start conversation into setup.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Mail size={18} style={{ color: '#9ca3af', position: 'absolute', marginLeft: '12px' }} />
                  <input
                    type="email"
                    className="rg-input"
                    style={{ paddingLeft: '38px' }}
                    required
                    placeholder="owner@example.com"
                    value={onboardEmail}
                    onChange={(e) => setOnboardEmail(e.target.value)}
                  />
                </span>

                <button type="submit" disabled={isOnboarding} className="rg-btn-primary" style={{ width: '100%', minHeight: '48px', fontSize: '15px' }}>
                  {isOnboarding ? 'Opening setup...' : (
                    <>
                      See Your Review Drafts in 2 Minutes <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
              <p style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af', textAlign: 'center', fontWeight: 500 }}>
                🔒 We respect your privacy. No spam, ever.
              </p>
            </form>
          </div>

          <div className="rg-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px', fontSize: '17px', color: '#111827' }}>
              <ShieldCheck size={19} style={{ color: '#2563eb' }} /> Industry snapshots
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.keys(OUTREACH_TEMPLATES).map((item) => (
                <Link
                  key={item}
                  href={`/snapshot/${item}`}
                  style={{
                    textDecoration: 'none',
                    fontSize: '13px',
                    color: industry === item ? '#2563eb' : '#4b5563',
                    fontWeight: 850,
                    border: '1px solid #e5e7eb',
                    padding: '9px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    backgroundColor: industry === item ? '#eff6ff' : '#ffffff',
                    textTransform: 'capitalize',
                  }}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
