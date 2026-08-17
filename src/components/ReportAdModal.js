import React, { useEffect, useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { trackReport } from '../utils/siteAnalytics';

export default function ReportAdModal({ adId, onClose }) {
  const { apiFetch, showToast } = useApp();
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await apiFetch('/api/ads/reportReasons');
        const list = Array.isArray(res) ? res : (res.data || []);
        if (!cancelled) setReasons(list);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiFetch]);

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/ads/reportAd', {
        method: 'POST',
        body: JSON.stringify({ adId, reasonId: selected }),
      });
      trackReport({ id: adId });
      showToast('Report submitted. We will review this ad.', 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Could not submit report. Please try again.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal report-modal">
        <button type="button" className="report-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="report-modal-icon"><Flag size={22} /></div>
        <div className="modal-title">Report this ad</div>
        <div className="modal-sub">Tell us why you're reporting this listing.</div>

        {loading && (
          <div className="report-modal-state"><div className="spinner" style={{ width: 22, height: 22 }} /></div>
        )}

        {!loading && error && (
          <div className="report-modal-state report-modal-error">Couldn't load reasons. Please try again.</div>
        )}

        {!loading && !error && reasons.length === 0 && (
          <div className="report-modal-state">No reporting reasons are available right now.</div>
        )}

        {!loading && !error && reasons.length > 0 && (
          <div className="report-reason-list">
            {reasons.map((r) => (
              <label key={r._id} className={`report-reason-item${selected === r._id ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="report-reason"
                  value={r._id}
                  checked={selected === r._id}
                  onChange={() => setSelected(r._id)}
                />
                <span className="report-reason-text">
                  <span className="report-reason-title">{r.reason}</span>
                  {r.description && <span className="report-reason-desc">{r.description}</span>}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="modal-btns">
          <button type="button" className="modal-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            type="button"
            className="modal-confirm"
            onClick={submit}
            disabled={!selected || submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
