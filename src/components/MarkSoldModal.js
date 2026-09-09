import React, { useEffect, useState } from 'react';
import { X, CircleCheck, ChevronDown, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { trackMarkSold } from '../utils/siteAnalytics';

export default function MarkSoldModal({ ad, open, onClose, onSold }) {
  const { apiFetch, showToast } = useApp();
  const [buyers, setBuyers] = useState([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [soldAmount, setSoldAmount] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !ad?.id) return;
    setSelectedBuyer('');
    setSoldAmount(String(ad.price ?? ''));
    setDropdownOpen(false);
    setLoadingBuyers(true);
    apiFetch('/api/ads/getUsersInterestedInAd', {
      method: 'POST',
      body: JSON.stringify({ adId: ad.id }),
    })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.users || []);
        setBuyers(list);
      })
      .catch(() => setBuyers([]))
      .finally(() => setLoadingBuyers(false));
  }, [open, ad?.id, ad?.price, apiFetch]);

  if (!open || !ad) return null;

  const selected = buyers.find((u) => u._id === selectedBuyer);

  const confirm = async () => {
    if (!soldAmount.trim()) {
      showToast('Please enter the sale amount.', 'error');
      return;
    }
    if (!selectedBuyer) {
      showToast('Please select the buyer.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/ads/markAdAsSold', {
        method: 'POST',
        body: JSON.stringify({
          adId: ad.id,
          buyerId: selectedBuyer,
          amount: soldAmount.trim(),
        }),
      });
      trackMarkSold({ id: ad.id, title: ad.title });
      onSold({
        adId: ad.id,
        adTitle: ad.title,
        revieweeName: selected?.name || selected?.email || 'Buyer',
        revieweePic: selected?.profilePic || null,
        counterpartyName: selected?.name || selected?.email || 'Buyer',
        saleAmount: soldAmount.trim(),
      });
      onClose();
    } catch (err) {
      showToast(err.message || 'Could not mark ad as sold.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal mark-sold-modal" role="dialog" aria-labelledby="mark-sold-title">
        <button type="button" className="mark-sold-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="mark-sold-header">
          <div className="mark-sold-icon" aria-hidden>
            <CircleCheck size={22} strokeWidth={2} />
          </div>
          <div className="mark-sold-header-text">
            <h2 id="mark-sold-title" className="mark-sold-title">Mark as sold</h2>
            <p className="mark-sold-sub">Record the buyer and final price for this listing.</p>
          </div>
        </div>

        <div className="mark-sold-listing" title={ad.title}>{ad.title}</div>

        <div className="mark-sold-field">
          <label className="mark-sold-label" htmlFor="mark-sold-buyer">Buyer</label>
          {loadingBuyers ? (
            <div className="mark-sold-loading">
              <div className="spinner" style={{ width: 20, height: 20 }} />
              <span>Loading buyers…</span>
            </div>
          ) : (
            <div className="mark-sold-select-wrap">
              <button
                id="mark-sold-buyer"
                type="button"
                className={`mark-sold-select${dropdownOpen ? ' open' : ''}${selected ? ' has-value' : ''}`}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
              >
                <UserRound size={16} className="mark-sold-select-icon" />
                <span className="mark-sold-select-value">
                  {selected ? (selected.name || selected.email) : 'Choose a buyer'}
                </span>
                <ChevronDown size={16} className="mark-sold-select-chevron" />
              </button>
              {dropdownOpen && (
                <ul className="mark-sold-options" role="listbox">
                  {buyers.length === 0 ? (
                    <li className="mark-sold-empty">No one has messaged about this ad yet.</li>
                  ) : (
                    buyers.map((u) => (
                      <li key={u._id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedBuyer === u._id}
                          className={`mark-sold-option${selectedBuyer === u._id ? ' selected' : ''}`}
                          onClick={() => {
                            setSelectedBuyer(u._id);
                            setDropdownOpen(false);
                          }}
                        >
                          {u.name || u.email || 'Unknown buyer'}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mark-sold-field">
          <label className="mark-sold-label" htmlFor="mark-sold-amount">Sale amount</label>
          <div className="mark-sold-amount-wrap">
            <span className="mark-sold-currency">₹</span>
            <input
              id="mark-sold-amount"
              type="number"
              className="mark-sold-amount-input"
              placeholder="0"
              value={soldAmount}
              onChange={(e) => setSoldAmount(e.target.value)}
              min="0"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          type="button"
          className="mark-sold-submit"
          onClick={confirm}
          disabled={submitting || !selectedBuyer || !soldAmount.trim() || loadingBuyers}
        >
          {submitting ? 'Saving…' : 'Complete sale'}
        </button>
      </div>
    </div>
  );
}
