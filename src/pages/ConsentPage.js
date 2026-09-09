import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { unregisterPushToken } from '../utils/pushNotifications';

export default function ConsentPage() {
  const { user, apiFetch, navigate, showToast, showModal, hasConsented, setHasConsented } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await apiFetch('/api/users/getLatestConsentVersion');
        if (!cancelled) { setData(res.data || res); setLoading(false); }
      } catch { if (!cancelled) { setError(true); setLoading(false); } }
    }
    load();
    return () => { cancelled = true; };
  }, [apiFetch]);

  const parseHtml = (html) => {
    if (!html) return '';
    return html
      .replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>')
      .replace(/<br\s*\/?>/g, '<br/>');
  };

  const handleAccept = async () => {
    if (!data?.version) return;
    try {
      await apiFetch('/api/users/acceptConsent', {
        method: 'POST',
        body: JSON.stringify({ version: data.version, status: 'accepted', timestamp: new Date().toISOString() }),
      });
      setHasConsented(true);
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      stored.hasConsented = true;
      localStorage.setItem('user', JSON.stringify(stored));
      showToast('Consent accepted!', 'success');
      navigate('home');
    } catch { showToast('Failed to save consent.', 'error'); }
  };

  const handleRevoke = () => {
    showModal('Revoke Consent', 'Withdraw your consent? You will be logged out.', '⚠️', async () => {
      try {
        await unregisterPushToken(apiFetch);
        await apiFetch('/api/users/revokeConsent', {
          method: 'POST',
          body: JSON.stringify({ version: data?.version, status: 'revoked', timestamp: new Date().toISOString() }),
        });
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.reload();
      } catch { showToast('Failed to revoke consent.', 'error'); }
    });
  };

  if (loading) return <div className="empty-state"><div className="spinner" /></div>;
  if (error) return <div className="empty-state"><span className="empty-title">Could not load policy details.</span></div>;

  return (
    <div className="consent-layout">
      <div className="consent-header-card">
        <div className="consent-brand">
          <div>
            <div className="consent-title">User Consent</div>
            <div className="consent-sub">Privacy Policy & Terms of Service</div>
          </div>
        </div>
      </div>

      <div className="consent-info-card">
        <Shield size={20} color="var(--success)" />
        <div>We prioritize your privacy. Your data is handled in accordance with the DPDP Act (India).</div>
      </div>

      {data?.privacyNotice && (
        <div className="consent-section">
          <div className="consent-section-header">
            <Lock size={18} color="var(--primary)" />
            <div className="consent-section-title">Privacy Notice</div>
          </div>
          <div
            className="consent-policy-card consent-html"
            dangerouslySetInnerHTML={{ __html: parseHtml(data.privacyNotice) }}
          />
        </div>
      )}

      {data?.termsOfService && (
        <div className="consent-section">
          <div className="consent-section-header">
            <FileText size={18} color="var(--primary)" />
            <div className="consent-section-title">Terms of Service</div>
          </div>
          <div
            className="consent-policy-card consent-html"
            dangerouslySetInnerHTML={{ __html: parseHtml(data.termsOfService) }}
          />
        </div>
      )}

      {data?.version && (
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16 }}>
          Policy Version {data.version}
        </div>
      )}

      <div className="consent-footer">
        {hasConsented
          ? <button className="revoke-btn" onClick={handleRevoke}>⚠ Withdraw Consent</button>
          : <button className="accept-btn" onClick={handleAccept}>Accept & Continue</button>}
      </div>
    </div>
  );
}
