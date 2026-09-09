import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  dismissPushPrompt,
  enableWebPush,
  shouldOfferPushPrompt,
} from '../utils/pushNotifications';

export default function PushPrompt() {
  const { user, apiFetch, showToast } = useApp();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?._id) {
      setVisible(false);
      return undefined;
    }
    let cancelled = false;
    shouldOfferPushPrompt().then((offer) => {
      if (!cancelled) setVisible(offer);
    });
    return () => { cancelled = true; };
  }, [user?._id]);

  if (!visible) return null;

  const hide = () => {
    dismissPushPrompt();
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await enableWebPush(apiFetch);
      showToast('Notifications enabled.', 'success');
      setVisible(false);
    } catch (err) {
      showToast(err.message || 'Could not enable notifications.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="push-prompt" role="region" aria-label="Enable notifications">
      <div className="push-prompt-inner">
        <div className="push-prompt-icon" aria-hidden>
          <Bell size={16} strokeWidth={2.25} />
        </div>
        <p className="push-prompt-text">
          Get a notification when someone messages you about an ad.
        </p>
        <div className="push-prompt-actions">
          <button type="button" className="push-prompt-later" onClick={hide} disabled={busy}>
            Later
          </button>
          <button type="button" className="push-prompt-enable" onClick={enable} disabled={busy}>
            {busy ? 'Enabling…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}
