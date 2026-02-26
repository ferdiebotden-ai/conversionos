'use client';

/**
 * Public Quote Acceptance Page
 * Customers land here from the email CTA to review and approve their quote.
 * No auth required — token-based access.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ---- Types ----

interface QuoteSummary {
  projectType: string;
  total: number;
  deposit: number;
  lineItemCount: number;
  validity: string | null;
  contractorName: string;
}

interface BrandingInfo {
  name: string;
  primaryColor: string;
  logoUrl?: string | null;
  phone: string;
  email: string;
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'pending'; quote: QuoteSummary; branding: BrandingInfo }
  | { kind: 'accepted'; acceptedAt: string; acceptedByName: string }
  | { kind: 'expired'; branding: BrandingInfo }
  | { kind: 'not_found' }
  | { kind: 'submitted'; acceptedAt: string };

// ---- Helpers ----

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen Renovation',
  bathroom: 'Bathroom Renovation',
  basement: 'Basement Finishing',
  flooring: 'Flooring Installation',
  painting: 'Painting',
  exterior: 'Exterior Work',
  other: 'Renovation Project',
};

// ---- Component ----

export default function QuoteAcceptancePage() {
  const params = useParams();
  const token = params?.['token'] as string;

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch quote data on mount
  useEffect(() => {
    if (!token) {
      setState({ kind: 'not_found' });
      return;
    }

    fetch(`/api/quotes/accept/${token}`)
      .then((res) => {
        if (!res.ok) {
          setState({ kind: 'not_found' });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;

        if (data.status === 'pending') {
          setState({ kind: 'pending', quote: data.quote, branding: data.branding });
        } else if (data.status === 'accepted') {
          setState({ kind: 'accepted', acceptedAt: data.acceptedAt, acceptedByName: data.acceptedByName });
        } else if (data.status === 'expired') {
          setState({ kind: 'expired', branding: data.branding });
        } else {
          setState({ kind: 'not_found' });
        }
      })
      .catch(() => {
        setState({ kind: 'not_found' });
      });
  }, [token]);

  // Submit acceptance
  const handleAccept = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2 || !confirmed) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/quotes/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), confirm: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to accept quote');
        return;
      }

      setState({ kind: 'submitted', acceptedAt: data.acceptedAt });
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [token, name, confirmed]);

  // ---- Render states ----

  if (state.kind === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e5e5', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#666', fontSize: 15 }}>Loading quote...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
        <div style={{ maxWidth: 420, padding: 40, background: '#fff', borderRadius: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>Quote Not Found</h1>
          <p style={{ fontSize: 15, color: '#666', margin: 0, lineHeight: 1.5 }}>
            This quote link is invalid or has been removed. Please contact your contractor for an updated estimate.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === 'accepted') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
        <div style={{ maxWidth: 420, padding: 40, background: '#fff', borderRadius: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: '#16a34a' }}>&#10003;</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>Quote Already Approved</h1>
          <p style={{ fontSize: 15, color: '#666', margin: 0, lineHeight: 1.5 }}>
            This quote was approved on {formatDate(state.acceptedAt)} by {state.acceptedByName}.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === 'expired') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
        <div style={{ maxWidth: 420, padding: 40, background: '#fff', borderRadius: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: '#d97706' }}>&#9200;</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>Quote Expired</h1>
          <p style={{ fontSize: 15, color: '#666', margin: 0, lineHeight: 1.5 }}>
            This quote has expired. Please contact {state.branding.name} for an updated estimate.
          </p>
          {(state.branding.phone || state.branding.email) && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e5e5' }}>
              {state.branding.phone && (
                <a href={`tel:${state.branding.phone.replace(/[^+\d]/g, '')}`} style={{ display: 'block', color: state.branding.primaryColor, fontSize: 15, textDecoration: 'none', marginBottom: 4 }}>
                  {state.branding.phone}
                </a>
              )}
              {state.branding.email && (
                <a href={`mailto:${state.branding.email}`} style={{ display: 'block', color: state.branding.primaryColor, fontSize: 15, textDecoration: 'none' }}>
                  {state.branding.email}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.kind === 'submitted') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
        <div style={{ maxWidth: 420, padding: 40, background: '#fff', borderRadius: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: '#16a34a' }}>&#10003;</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>Quote Approved!</h1>
          <p style={{ fontSize: 15, color: '#666', margin: 0, lineHeight: 1.5 }}>
            Thank you for approving this quote. Your contractor will be in touch shortly to schedule next steps.
          </p>
          <p style={{ fontSize: 13, color: '#999', marginTop: 12 }}>
            Approved on {formatDate(state.acceptedAt)}
          </p>
        </div>
      </div>
    );
  }

  // state.kind === 'pending'
  const { quote, branding } = state;
  const projectLabel = PROJECT_TYPE_LABELS[quote.projectType] || 'Renovation Project';
  const isFormValid = name.trim().length >= 2 && confirmed;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Branding header */}
      <div style={{ background: '#fff', borderBottom: `3px solid ${branding.primaryColor}`, padding: '20px 24px' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.name} style={{ height: 36, objectFit: 'contain' }} />
          ) : (
            <h2 style={{ fontSize: 22, fontWeight: 700, color: branding.primaryColor, margin: 0 }}>{branding.name}</h2>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>
          Review Your Quote
        </h1>
        <p style={{ fontSize: 15, color: '#666', margin: '0 0 24px', lineHeight: 1.5 }}>
          {branding.name} has prepared the following quote for your {projectLabel.toLowerCase()}.
        </p>

        {/* Quote summary card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: branding.primaryColor, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>
            Quote Summary
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: '#666' }}>Project Type</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{projectLabel}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: '#666' }}>Line Items</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{quote.lineItemCount} items</span>
          </div>

          <div style={{ borderTop: `2px solid ${branding.primaryColor}`, paddingTop: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Total (incl. HST)</span>
              <span style={{ fontSize: 26, fontWeight: 700, color: branding.primaryColor }}>{formatCurrency(quote.total || 0)}</span>
            </div>
            <p style={{ fontSize: 14, color: '#666', margin: '8px 0 0' }}>
              Deposit required: {formatCurrency(quote.deposit || 0)}
            </p>
          </div>

          {quote.validity && (
            <p style={{ fontSize: 13, color: '#999', margin: '12px 0 0', background: '#f3f4f6', padding: '6px 12px', borderRadius: 4, display: 'inline-block' }}>
              Valid until {formatDate(quote.validity)}
            </p>
          )}
        </div>

        {/* Acceptance form */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>
            Approve This Quote
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="accept-name" style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>
              Type your full name to approve
            </label>
            <input
              id="accept-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              autoComplete="name"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ width: 20, height: 20, marginTop: 2, accentColor: branding.primaryColor }}
              />
              <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                I have reviewed this quote and accept the terms, pricing, and conditions as outlined. I understand that a deposit of {formatCurrency(quote.deposit || 0)} is required to proceed.
              </span>
            </label>
          </div>

          {submitError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
              {submitError}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={!isFormValid || submitting}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: 17,
              fontWeight: 600,
              color: '#fff',
              background: isFormValid && !submitting ? branding.primaryColor : '#9ca3af',
              border: 'none',
              borderRadius: 10,
              cursor: isFormValid && !submitting ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            {submitting ? 'Processing...' : 'Approve Quote'}
          </button>

          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>
            Your typed name serves as your electronic signature. This acceptance is legally binding.
          </p>
        </div>
      </div>
    </div>
  );
}
