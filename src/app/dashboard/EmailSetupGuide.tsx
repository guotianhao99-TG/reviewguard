'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Mail } from 'lucide-react';

type ProviderKey = 'gmail' | 'outlook' | 'yahoo';

interface EmailSetupGuideProps {
  forwardingAddress?: string;
}

interface GuideStep {
  title: string;
  description: string;
  image: string;
}

interface ProviderGuide {
  key: ProviderKey;
  label: string;
  title: string;
  intro: string;
  steps: GuideStep[];
}

const guides: ProviderGuide[] = [
  {
    key: 'gmail',
    label: 'Gmail',
    title: 'Gmail Forwarding',
    intro: 'Route Google review emails from Gmail into ReviewGuard.',
    steps: [
      {
        title: 'Open Settings',
        description: 'In Gmail, select the Settings icon, then open See all settings.',
        image: 'https://placehold.co/960x540/eef2ff/1f2937?text=Gmail+Settings',
      },
      {
        title: 'Choose Forwarding and POP/IMAP',
        description: 'Open the Forwarding and POP/IMAP tab from the settings navigation.',
        image: 'https://placehold.co/960x540/eef2ff/1f2937?text=Forwarding+and+POP%2FIMAP',
      },
      {
        title: 'Add Forwarding Address',
        description: 'Click Add a forwarding address and paste the ReviewGuard forwarding address.',
        image: 'https://placehold.co/960x540/eef2ff/1f2937?text=Add+Forwarding+Address',
      },
      {
        title: 'Confirm Forwarding',
        description: 'Gmail sends a confirmation email. Confirm the code, then enable forwarding.',
        image: 'https://placehold.co/960x540/eef2ff/1f2937?text=Confirm+Forwarding',
      },
    ],
  },
  {
    key: 'outlook',
    label: 'Outlook',
    title: 'Outlook Forwarding',
    intro: 'Forward Outlook review notifications to the ReviewGuard intake inbox.',
    steps: [
      {
        title: 'Open Settings',
        description: 'In Outlook, open Settings from the top toolbar.',
        image: 'https://placehold.co/960x540/ecfdf5/1f2937?text=Outlook+Settings',
      },
      {
        title: 'Go to Mail',
        description: 'Select Mail in the settings sidebar.',
        image: 'https://placehold.co/960x540/ecfdf5/1f2937?text=Mail+Settings',
      },
      {
        title: 'Open Forwarding',
        description: 'Choose Forwarding, then turn on the forwarding option.',
        image: 'https://placehold.co/960x540/ecfdf5/1f2937?text=Forwarding',
      },
      {
        title: 'Enter Address',
        description: 'Paste the ReviewGuard forwarding address and save the setting.',
        image: 'https://placehold.co/960x540/ecfdf5/1f2937?text=Enter+Forwarding+Address',
      },
    ],
  },
  {
    key: 'yahoo',
    label: 'Yahoo',
    title: 'Yahoo Forwarding',
    intro: 'Send Yahoo review alert emails into the same ReviewGuard workflow.',
    steps: [
      {
        title: 'Open Account Info',
        description: 'In Yahoo Mail, open Account Info from the account menu.',
        image: 'https://placehold.co/960x540/fff7ed/1f2937?text=Yahoo+Account+Info',
      },
      {
        title: 'Open Security',
        description: 'Navigate to Security from the account settings area.',
        image: 'https://placehold.co/960x540/fff7ed/1f2937?text=Security',
      },
      {
        title: 'Find Forwarding Address',
        description: 'Locate Forwarding address in the mail or security settings.',
        image: 'https://placehold.co/960x540/fff7ed/1f2937?text=Forwarding+Address',
      },
      {
        title: 'Add and Verify',
        description: 'Enter the ReviewGuard forwarding address and complete any verification prompt.',
        image: 'https://placehold.co/960x540/fff7ed/1f2937?text=Add+and+Verify',
      },
    ],
  },
];

export function EmailSetupGuide({
  forwardingAddress = 'guotianhao99@gmail.com',
}: EmailSetupGuideProps) {
  const [activeProvider, setActiveProvider] = useState<ProviderKey>('gmail');
  const activeGuide = useMemo(
    () => guides.find((guide) => guide.key === activeProvider) || guides[0],
    [activeProvider]
  );

  return (
    <div className="rg-email-guide">
      <div className="rg-email-guide-header">
        <div>
          <p className="rg-eyebrow">Forwarding guide</p>
          <h3>{activeGuide.title}</h3>
          <p>{activeGuide.intro}</p>
        </div>
        <div className="rg-forwarding-target" aria-label="Forwarding address">
          <Mail size={18} />
          <span>{forwardingAddress}</span>
          <button
            type="button"
            title="Copy forwarding address"
            onClick={() => {
              navigator.clipboard.writeText(forwardingAddress);
              alert('Forwarding address copied.');
            }}
          >
            <Copy size={15} />
          </button>
        </div>
      </div>

      <div className="rg-email-tabs" role="tablist" aria-label="Email provider setup guides">
        {guides.map((guide) => (
          <button
            key={guide.key}
            type="button"
            role="tab"
            aria-selected={activeProvider === guide.key}
            className={activeProvider === guide.key ? 'is-active' : ''}
            onClick={() => setActiveProvider(guide.key)}
          >
            {guide.label}
          </button>
        ))}
      </div>

      <div className="rg-email-guide-panel" role="tabpanel">
        {activeGuide.steps.map((step, index) => (
          <article key={step.title} className="rg-email-step">
            <div
              className="rg-email-step-image"
              role="img"
              aria-label={`${activeGuide.label} screenshot placeholder ${index + 1}`}
              style={{ backgroundImage: `url("${step.image}")` }}
            />
            <div>
              <span className="rg-step-number">{index + 1}</span>
              <h4>{step.title}</h4>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="rg-forwarding-note">
        <CheckCircle2 size={17} />
        <span>Final forwarding address: {forwardingAddress}</span>
      </div>
    </div>
  );
}
