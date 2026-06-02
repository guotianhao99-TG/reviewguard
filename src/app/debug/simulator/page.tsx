'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileText,
  Mail,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  Star,
} from 'lucide-react';
import Link from 'next/link';

interface SimulatorResponse {
  message?: string;
  reviewId?: string;
  confidence?: number;
  magicLink?: string;
  code?: string;
  simulated?: boolean;
  [key: string]: unknown;
}

type ScenarioType = '1star' | '3star' | 'gmail';

interface Scenario {
  id: ScenarioType;
  title: string;
  eyebrow: string;
  description: string;
  runLabel: string;
}

const MOCK_1_STAR_TEMPLATE = `
Delivered-To: incoming+hvac-plumbing-123@reviewguard.com
Subject: New review on Google for CoolAir Heating & Cooling
From: Google Business Profile <businessprofile-noreply@google.com>
Content-Type: text/html; charset=UTF-8

<!DOCTYPE html>
<html>
<body>
  <div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
    <h2>You received a new 1-star review!</h2>
    <p><strong>Reviewer:</strong> James Peterson</p>
    <p><strong>Rating:</strong> ★☆☆☆☆ (1/5 stars)</p>
    <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #dc2626;">
      "Terrible customer service! The technician showed up 3 hours late and charged me $250 just to look at the furnace. When I complained, he was extremely rude and told me to find someone else if I didn't like the price. Avoid this HVAC company at all costs!"
    </div>
    <p><a href="https://google.com/maps/reviews/coolair/12345">Respond to James on Google Maps</a></p>
  </div>
</body>
</html>
`;

const MOCK_3_STAR_TEMPLATE = `
Delivered-To: incoming+hvac-plumbing-123@reviewguard.com
Subject: James Miller left a review for CoolAir Heating & Cooling
From: Google Business <businessprofile-noreply@google.com>

James Miller rated you 3 stars on Google.

"The AC repair was done quickly and the system works fine now. However, the technician left greasy fingerprints all over our white wall in the hallway, and the price was a bit higher than the initial quote. Decent work but lack of attention to detail."

View review details: https://google.com/maps/reviews/coolair/67890
`;

const MOCK_GMAIL_VERIFICATION_TEMPLATE = `
Subject: Gmail Forwarding Confirmation - Receive Mail from forward-hvac-plumbing-123@reviewguard.com
From: Gmail Team <mail-noreply@google.com>

You have requested to automatically forward mail to incoming+hvac-plumbing-123@reviewguard.com.
To confirm this permission, please click the link below to approve the request:

https://mail.google.com/mail/vf-983hf8h48fhe8fh9efh9sefh8hsefafe?key=RG_GMAIL_CONFIRM_KEY

Or enter the confirmation code on your Gmail settings screen:
Confirmation Code: 498-382-901
`;

const SCENARIOS: Scenario[] = [
  {
    id: '1star',
    title: '1-Star Google Review',
    eyebrow: 'Urgent Alert Demo',
    description: 'Simulates a negative review to show how ReviewGuard instantly sends a Magic Link with reply drafts.',
    runLabel: 'Test 1-Star Alert',
  },
  {
    id: '3star',
    title: '3-Star Google Review',
    eyebrow: 'Standard Alert Demo',
    description: 'Simulates a moderate review to demonstrate the standard Magic Link workflow for owners.',
    runLabel: 'Test 3-Star Alert',
  },
  {
    id: 'gmail',
    title: 'Gmail Forwarding Code',
    eyebrow: 'Setup Demo',
    description: 'Simulates the Gmail forwarding confirmation email to show how ReviewGuard extracts the setup code.',
    runLabel: 'Test Setup Code',
  },
];

const scenarioCopy: Record<ScenarioType, { subject: string; body: string }> = {
  '1star': {
    subject: 'New review on Google for CoolAir Heating & Cooling',
    body: MOCK_1_STAR_TEMPLATE,
  },
  '3star': {
    subject: 'James Miller left a review for CoolAir Heating & Cooling',
    body: MOCK_3_STAR_TEMPLATE,
  },
  gmail: {
    subject: 'Gmail Forwarding Confirmation - Receive Mail from forward-hvac-plumbing-123@reviewguard.com',
    body: MOCK_GMAIL_VERIFICATION_TEMPLATE,
  },
};

function ScenarioIcon({ type }: { type: ScenarioType }) {
  if (type === 'gmail') {
    return <Mail size={20} />;
  }

  return <Star size={20} />;
}

export default function SimulatorPage() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('1star');
  const [subject, setSubject] = useState(scenarioCopy['1star'].subject);
  const [htmlBody, setHtmlBody] = useState(scenarioCopy['1star'].body);
  const [webhookSecret, setWebhookSecret] = useState('rg_inbound_secret_demo');
  const [customToAddress, setCustomToAddress] = useState('forward-reviews-staging@reviewguard.com');

  const [isLoading, setIsLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<SimulatorResponse | null>(null);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  const currentScenario = SCENARIOS.find((scenario) => scenario.id === selectedScenario) ?? SCENARIOS[0];
  const hasResult = Boolean(responseLog?.magicLink || responseLog?.code);

  const selectScenario = (type: ScenarioType) => {
    setSelectedScenario(type);
    setSubject(scenarioCopy[type].subject);
    setHtmlBody(scenarioCopy[type].body);
    setResponseLog(null);
    setErrorLog(null);
  };

  const runDemo = async () => {
    setIsLoading(true);
    setResponseLog(null);
    setErrorLog(null);

    const messageId = `SIM_MSG_${Date.now()}_${Math.floor(Math.random() * 10000)}@reviewguard.com`;

    try {
      const response = await fetch('/api/webhooks/inbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ReviewGuard-Webhook-Secret': webhookSecret,
        },
        body: JSON.stringify({
          MessageID: messageId,
          From: selectedScenario === 'gmail' ? 'mail-noreply@google.com' : 'businessprofile-noreply@google.com',
          To: customToAddress,
          Subject: subject,
          HtmlBody: htmlBody,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'The test could not be completed.');
      }

      setResponseLog(data);
    } catch (e: unknown) {
      setErrorLog(e instanceof Error ? e.message : 'The test could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '36px 20px 56px' }}>
      <div className="rg-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#2563eb', fontSize: '13px', fontWeight: 800 }}>
            <ShieldCheck size={16} />
            ReviewGuard Demo Simulator
          </div>
          <h1 style={{ fontSize: '34px', lineHeight: 1.1, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
            Run a clean customer demo
          </h1>
          <p style={{ color: '#4b5563', margin: 0, fontSize: '16px', maxWidth: '680px' }}>
            Choose a test scenario, run it, then open the result page your customer would see.
          </p>
        </div>

        <Link href="/dashboard" className="rg-btn-secondary" style={{ textDecoration: 'none', flexShrink: 0 }}>
          Open Dashboard <ArrowRight size={16} />
        </Link>
      </div>

      <div className="rg-simulator-steps" aria-label="Demo flow">
        <div className="rg-demo-step">
          <span>1</span>
          Choose Test Scenario
        </div>
        <div className="rg-demo-step">
          <span>2</span>
          Run Test
        </div>
        <div className="rg-demo-step">
          <span>3</span>
          Open Result
        </div>
      </div>

      <div className="rg-simulator-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(340px, 0.85fr)', gap: '22px', alignItems: 'start' }}>
        <section className="rg-card" aria-labelledby="choose-scenario-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <FileText size={20} style={{ color: '#2563eb' }} />
            <div>
              <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>Step 1</p>
              <h2 id="choose-scenario-title" style={{ margin: 0, color: '#111827', fontSize: '22px', lineHeight: 1.2 }}>
                Choose Test Scenario
              </h2>
            </div>
          </div>

          <div className="rg-scenario-grid">
            {SCENARIOS.map((scenario) => {
              const selected = scenario.id === selectedScenario;

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => selectScenario(scenario.id)}
                  className="rg-scenario-option"
                  aria-pressed={selected}
                  style={{
                    borderColor: selected ? '#2563eb' : '#e5e7eb',
                    backgroundColor: selected ? '#eff6ff' : '#ffffff',
                    boxShadow: selected ? '0 0 0 3px rgba(37, 99, 235, 0.14)' : 'none',
                  }}
                >
                  <span className="rg-scenario-icon" style={{ color: selected ? '#2563eb' : '#4b5563' }}>
                    <ScenarioIcon type={scenario.id} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#6b7280', marginBottom: '4px' }}>
                      {scenario.eyebrow}
                    </span>
                    <span style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
                      {scenario.title}
                    </span>
                    <span style={{ display: 'block', color: '#4b5563', fontSize: '14px', lineHeight: 1.45 }}>
                      {scenario.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rg-card" aria-labelledby="run-test-title" style={{ borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Play size={20} style={{ color: '#2563eb' }} />
            <div>
              <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>Step 2</p>
              <h2 id="run-test-title" style={{ margin: 0, color: '#111827', fontSize: '22px', lineHeight: 1.2 }}>
                Run Test
              </h2>
            </div>
          </div>

          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6b7280', fontWeight: 700 }}>Selected scenario</p>
            <p style={{ margin: 0, color: '#111827', fontWeight: 800, fontSize: '18px' }}>{currentScenario.title}</p>
          </div>

          <button
            type="button"
            onClick={runDemo}
            disabled={isLoading}
            className="rg-btn-primary"
            style={{ width: '100%', minHeight: '50px', fontSize: '16px', opacity: isLoading ? 0.82 : 1 }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Running Test
              </>
            ) : (
              <>
                <Play size={18} /> {currentScenario.runLabel}
              </>
            )}
          </button>

          <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '13px', lineHeight: 1.45 }}>
            This uses the same local demo pipeline as the customer flow, then shows the next page to open.
          </p>
        </section>
      </div>

      <section className="rg-card" aria-labelledby="open-result-title" style={{ marginTop: '22px', borderTop: hasResult ? '4px solid #16a34a' : '1px solid #e5e7eb' }}>
        <div className="rg-result-panel">
          <div>
            <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>Step 3</p>
            <h2 id="open-result-title" style={{ margin: '0 0 8px', color: '#111827', fontSize: '24px', lineHeight: 1.2 }}>
              Open Result
            </h2>
            {!isLoading && !responseLog && !errorLog && (
              <p style={{ margin: 0, color: '#6b7280' }}>
                Run a test above, then this area will show the exact next page to open.
              </p>
            )}
          </div>

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2563eb', fontWeight: 700 }}>
              <RefreshCw size={20} className="animate-spin" />
              Preparing the demo result
            </div>
          )}

          {errorLog && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', color: '#991b1b', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>Test failed</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>{errorLog}</p>
              </div>
            </div>
          )}

          {responseLog?.magicLink && (
            <div className="rg-result-card" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <Check size={22} style={{ color: '#059669', flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', color: '#065f46', fontSize: '18px' }}>
                  Review alert is ready
                </h3>
                <p style={{ margin: '0 0 14px', color: '#047857', fontSize: '14px', lineHeight: 1.45 }}>
                  Open the Magic Page to review the suggested replies, switch tone, and copy the draft.
                </p>
                <a
                  href={responseLog.magicLink}
                  className="rg-btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  Open Magic Page <ArrowRight size={16} />
                </a>
              </div>
            </div>
          )}

          {responseLog?.code && (
            <div className="rg-result-card" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
              <Check size={22} style={{ color: '#d97706', flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', color: '#92400e', fontSize: '18px' }}>
                  Gmail code captured
                </h3>
                <p style={{ margin: '0 0 10px', color: '#78350f', fontSize: '14px' }}>
                  The Dashboard will show this confirmation code in the setup guide.
                </p>
                <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace', color: '#111827', letterSpacing: '1px', backgroundColor: '#ffffff', border: '1px solid #f59e0b', borderRadius: '6px', textAlign: 'center', padding: '10px 12px', marginBottom: '12px' }}>
                  {responseLog.code}
                </div>
                <Link href="/dashboard" className="rg-btn-primary" style={{ textDecoration: 'none' }}>
                  Open Dashboard <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <details className="rg-card" style={{ marginTop: '22px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} /> Technical details (Optional)
        </summary>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '10px 0 0', lineHeight: 1.45 }}>
          These fields show the raw data sent to the webhook during the test. You don't need to change anything here to run the demo.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '18px' }} className="rg-advanced-grid">
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Secret
            </label>
            <input
              type="password"
              className="rg-input"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Forwarding address
            </label>
            <input
              type="text"
              className="rg-input"
              value={customToAddress}
              onChange={(e) => setCustomToAddress(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
            Email subject
          </label>
          <input
            type="text"
            className="rg-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
            Raw email body
          </label>
          <textarea
            rows={10}
            className="rg-input"
            style={{ fontFamily: 'monospace', fontSize: '14px' }}
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
          />
        </div>

        {responseLog && (
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Raw result
            </label>
            <pre style={{ margin: 0, padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflowX: 'auto', fontSize: '12px', fontFamily: 'monospace', color: '#374151', border: '1px solid #e5e7eb' }}>
              {JSON.stringify(responseLog, null, 2)}
            </pre>
          </div>
        )}
      </details>
    </main>
  );
}
