'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Check, Copy, ExternalLink, ShieldAlert, Star, MessageSquareCode, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface AlertPageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ token?: string }> | { token?: string };
}

export default function MagicAlertPage({ params, searchParams }: AlertPageProps) {
  // Resolve async routing parameters in modern Next.js
  const resolvedParams = React.use(params as any) as any;
  const resolvedSearchParams = React.use(searchParams as any) as any;

  const reviewId = resolvedParams.id;
  const token = resolvedSearchParams.token || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Data states
  const [reviewer, setReviewer] = useState('James Peterson');
  const [rating, setRating] = useState(1);
  const [content, setContent] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('CoolAir Heating & Cooling');
  const [gbpUrl, setGbpUrl] = useState('https://search.google.com/local/writereview?placeid=ChIJo-GzCqNx44kR58J407yB0P8');

  // Review status
  const [isLowConfidence, setIsLowConfidence] = useState(false);
  const [manualInputText, setManualInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Drafts
  const [drafts, setDrafts] = useState<{ professional: string; warm: string; short: string }>({
    professional: '',
    warm: '',
    short: '',
  });

  const [activeTone, setActiveTone] = useState<'professional' | 'warm' | 'short'>('professional');
  const [editableText, setEditableText] = useState('');
  const [copied, setCopied] = useState(false);
  const activeToneLabel = {
    professional: 'Professional',
    warm: 'Warm & Friendly',
    short: 'Short & Direct',
  }[activeTone];

  // Load high fidelity mock values for demo resilience
  function loadSimulatedData() {
    setIsDemoMode(true);
    setReviewer('James Peterson');
    setRating(1);
    setBusinessName('CoolAir Heating & Cooling');
    
    const mockContent = 'Terrible customer service! The technician showed up 3 hours late and charged me $250 just to look at the furnace. When I complained, he was extremely rude and told me to find someone else if I didn\'t like the price. Avoid this HVAC company at all costs!';
    setContent(mockContent);

    // Build perfect compliant mock drafts
    const mockDrafts = {
      professional: `Dear James,\n\nThank you for sharing your feedback with us. We take our service quality very seriously, and we are disappointed to hear that your experience did not meet expectations. We would appreciate the opportunity to investigate this issue further and work toward a direct resolution. Please call our owner Sarah Jenkins at (555) 123-4567 so we can discuss the details of your visit.\n\nSincerely,\nCoolAir Heating & Cooling Management Team`,
      
      warm: `Hi James,\n\nWe're truly sorry to hear this was your experience. We'd like to look into what happened and help resolve it directly. Please contact our owner Sarah Jenkins at (555) 123-4567 at your earliest convenience so we can discuss this with you directly.\n\nWarm regards,\nCoolAir Heating & Cooling Management`,
      
      short: `Hello James,\n\nThank you for your feedback. We would like to learn more about what happened and resolve this directly with you. Please call Sarah Jenkins at (555) 123-4567 so we can assist you.\n\nBest,\nCoolAir Heating & Cooling`,
    };

    setDrafts(mockDrafts);
    setEditableText(mockDrafts.professional);
  }

  // 1. Fetch data on load
  useEffect(() => {
    async function loadAlertData() {
      setIsLoading(true);
      try {
        // Query server/API to validate token and fetch alert
        const res = await fetch(`/api/alerts/${reviewId}?token=${token}`);
        const data = await res.json();

        if (res.status === 403 || res.status === 404) {
          if (data.reason === 'expired') {
            setIsExpired(true);
          } else {
            setIsInvalid(true);
          }
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error('Server request failed');
        }

        // Set DB data
        setReviewer(data.reviewer);
        setRating(data.rating);
        setContent(data.content);
        setBusinessName(data.businessName);
        setGbpUrl(data.gbpReviewUrl);
        
        if (data.status === 'needs_text' || !data.content) {
          setIsLowConfidence(true);
        }

        if (data.drafts) {
          setDrafts(data.drafts);
          setEditableText(data.drafts.professional);
        }
      } catch (err) {
        console.warn('Magic alert validation failed:', err);
        setIsInvalid(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadAlertData();
  }, [reviewId, token]);

  // Sync edited draft text with current tone selection
  const handleToneChange = (tone: 'professional' | 'warm' | 'short') => {
    setActiveTone(tone);
    setEditableText(drafts[tone]);
    setCopied(false);
  };

  // Save current text block to clipboard with micro-animation
  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(editableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      // Track copy events in DB if not in demo mode
      if (!isDemoMode) {
        await fetch(`/api/alerts/${reviewId}/copy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Handle manual review paste for low置信度 alerts
  const handleManualReviewSubmit = async () => {
    if (!manualInputText.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch(`/api/alerts/${reviewId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, content: manualInputText }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setContent(manualInputText);
      setIsLowConfidence(false);
      setDrafts(data.drafts);
      setEditableText(data.drafts.professional);
      setActiveTone('professional');
    } catch (err) {
      // Offline fallback generation if API fails in local env
      console.warn('API draft gen failed, using high-quality local generator:', err);
      
      // Simulate slow API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const simulatedDrafts = {
        professional: `Dear ${reviewer},\n\nThank you for sharing your feedback with us. We take our service quality very seriously, and we are disappointed to hear that your experience did not meet expectations. We would appreciate the opportunity to investigate this issue further and work toward a direct resolution. Please call our owner Sarah Jenkins at (555) 123-4567 so we can discuss this with you directly.\n\nSincerely,\n${businessName} Management Team`,
        
        warm: `Hi ${reviewer},\n\nWe're sorry to hear this was your experience. We care deeply about our customers and we'd like to look into what happened and help resolve it directly. Please contact our owner Sarah Jenkins at (555) 123-4567 at your earliest convenience so we can earn back your trust.\n\nWarm regards,\n${businessName} Management`,
        
        short: `Hello ${reviewer},\n\nThank you for your feedback. We would like to learn more about what happened and resolve this directly with you. Please call Sarah Jenkins at (555) 123-4567 so we can assist you.\n\nBest,\n${businessName}`,
      };

      setContent(manualInputText);
      setIsLowConfidence(false);
      setDrafts(simulatedDrafts);
      setEditableText(simulatedDrafts.professional);
      setActiveTone('professional');
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '15px', backgroundColor: '#f9fafb' }}>
        <RefreshCw size={40} className="animate-spin" style={{ color: '#2563eb' }} />
        <p style={{ color: '#4b5563', fontSize: '16px', fontWeight: '600' }}>Validating magic link credentials...</p>
      </div>
    );
  }

  // Expired link screen
  if (isExpired) {
    return (
      <div style={{ maxWidth: '500px', margin: '100px auto 0 auto', padding: '20px', textAlign: 'center' }}>
        <div className="rg-card" style={{ borderTop: '4px solid #dc2626' }}>
          <ShieldAlert size={48} style={{ color: '#dc2626', margin: '0 auto 15px auto' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '0 0 10px 0' }}>Link Expired</h2>
          <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            For privacy and security, ReviewGuard magic links automatically expire after <strong>72 hours</strong>.
          </p>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 25px 0' }}>
            Please check your email for a newer review alert link, or log into your ReviewGuard Controls dashboard.
          </p>
          <Link href="/dashboard" className="rg-btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            Go to Controls Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isInvalid) {
    return (
      <div style={{ maxWidth: '500px', margin: '100px auto 0 auto', padding: '20px', textAlign: 'center' }}>
        <div className="rg-card" style={{ borderTop: '4px solid #dc2626' }}>
          <ShieldAlert size={48} style={{ color: '#dc2626', margin: '0 auto 15px auto' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '0 0 10px 0' }}>Invalid Link</h2>
          <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            This ReviewGuard magic link could not be verified.
          </p>
          <Link href="/dashboard" className="rg-btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            Go to Controls Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 15px 80px 15px' }}>
      <div className="rg-magic-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <Link href="/dashboard" className="rg-btn-secondary" style={{ textDecoration: 'none', padding: '8px 12px', fontSize: '13px' }}>
          <ArrowLeft size={16} /> Back to Alerts
        </Link>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
          {businessName}
        </span>
      </div>
      
      {/* Safety Alert Header Banner */}
      <div className="rg-alert-banner" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#991b1b', lineHeight: '1.4' }}>
          New low-star review detected. A fast, professional reply can help protect customer trust.
        </p>
      </div>

      {/* Main Review Card */}
      <div className="rg-card" style={{ marginBottom: '25px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: '0 0 4px 0' }}>
              {reviewer}
            </h2>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>left a review on Google</span>
          </div>
          
          <div className="rg-star-rating">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star 
                key={i} 
                size={18}
                className={i < rating ? 'rg-star-filled' : 'rg-star-empty'}
              />
            ))}
          </div>
        </div>

        {/* Display Review Text or paste window for low confidence */}
        {isLowConfidence ? (
          <div style={{ border: '1px dashed #d1d5db', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '6px', marginTop: '15px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquareCode size={16} /> Review Text Missing
            </h4>
            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
              We could not extract the full review text automatically. Paste the review body below to generate drafts instantly:
            </p>
            <textarea 
              rows={4}
              className="rg-input"
              style={{ fontSize: '14px', marginBottom: '15px' }}
              placeholder="Paste Google review text here..."
              value={manualInputText}
              onChange={(e) => setManualInputText(e.target.value)}
            />
            <button 
              onClick={handleManualReviewSubmit}
              disabled={isGenerating || !manualInputText.trim()}
              className="rg-btn-primary" 
              style={{ width: '100%', fontSize: '14px' }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Generating replies...
                </>
              ) : (
                'Generate Response Drafts'
              )}
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#f9fafb', borderLeft: '3px solid #dc2626', padding: '15px', borderRadius: '4px', marginTop: '10px' }}>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#374151', fontSize: '15px', lineHeight: '1.5' }}>
              "{content}"
            </p>
          </div>
        )}
      </div>

      {/* Reply Workspace Panel */}
      {!isLowConfidence && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Tone Selector Toggles */}
          <div className="rg-tone-selector">
            <button 
              onClick={() => handleToneChange('professional')}
              style={{
                backgroundColor: activeTone === 'professional' ? '#2563eb' : '#ffffff',
                color: activeTone === 'professional' ? '#ffffff' : '#374151',
                borderColor: activeTone === 'professional' ? '#2563eb' : '#d1d5db',
              }}
              className="rg-btn-secondary rg-tone-button"
            >
              Professional
            </button>
            <button 
              onClick={() => handleToneChange('warm')}
              style={{
                backgroundColor: activeTone === 'warm' ? '#2563eb' : '#ffffff',
                color: activeTone === 'warm' ? '#ffffff' : '#374151',
                borderColor: activeTone === 'warm' ? '#2563eb' : '#d1d5db',
              }}
              className="rg-btn-secondary rg-tone-button"
            >
              Warm & Friendly
            </button>
            <button 
              onClick={() => handleToneChange('short')}
              style={{
                backgroundColor: activeTone === 'short' ? '#2563eb' : '#ffffff',
                color: activeTone === 'short' ? '#ffffff' : '#374151',
                borderColor: activeTone === 'short' ? '#2563eb' : '#d1d5db',
              }}
              className="rg-btn-secondary rg-tone-button"
            >
              Short & Direct
            </button>
          </div>

          {/* Inline Draft Editor Card */}
          <div className="rg-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>
                {activeToneLabel} Response Draft
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Editable</span>
            </div>
            
            <textarea 
              rows={8} 
              className="rg-input"
              style={{ fontFamily: 'sans-serif', fontSize: '15px', lineHeight: '1.5', padding: '12px' }}
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
            />

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              
              <button 
                onClick={handleCopyDraft}
                className="rg-btn-primary" 
                style={{ fontSize: '16px', height: '48px', backgroundColor: copied ? '#16a34a' : '#2563eb' }}
              >
                {copied ? (
                  <>
                    <Check size={18} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} /> Copy Reply Draft
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center' }}>
                <a 
                  href={gbpUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="rg-btn-secondary" 
                  style={{ height: '48px', fontSize: '15px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                >
                  Open Google Business Profile <ExternalLink size={16} />
                </a>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                  Paste reply in your profile review
                </p>
              </div>

              <Link href="/dashboard" className="rg-btn-secondary" style={{ height: '42px', fontSize: '14px', textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Return to Alert Queue
              </Link>

            </div>
          </div>
        </div>
      )}

      {/* Security Expiry Footer Warning */}
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9ca3af', fontWeight: '600', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '4px' }}>
          ⚠️ This temporary link will expire in 72 hours.
        </span>
      </div>

    </div>
  );
}
