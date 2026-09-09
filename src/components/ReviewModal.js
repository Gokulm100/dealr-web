import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { trackReviewSubmitted } from '../utils/siteAnalytics';

const TAGS = [
  'Responsive',
  'Item as described',
  'Fair price',
  'No-show',
  'Scam attempt',
];

export default function ReviewModal({ adId, adTitle, revieweeName, revieweePic, onClose, onSubmitted }) {
  const { apiFetch, showToast } = useApp();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const submit = async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ adId, rating, tags: selectedTags, text: text.trim() }),
      });
      trackReviewSubmitted(adId);
      showToast('Review submitted. Thank you!', 'success');
      onSubmitted?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Could not submit review.', 'error');
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal review-modal">
        <button type="button" className="report-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal-title">Rate your experience</div>
        <div className="modal-sub">How was your experience for "{adTitle}"?</div>

        <div className="review-modal-user">
          {revieweePic
            ? <img className="review-modal-avatar" src={revieweePic} alt={revieweeName} />
            : <div className="review-modal-avatar-fallback">{revieweeName?.charAt(0) || 'U'}</div>}
          <span className="review-modal-name">{revieweeName}</span>
        </div>

        <div className="review-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="review-star-btn"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                size={32}
                fill={star <= displayRating ? '#f59e0b' : 'transparent'}
                color={star <= displayRating ? '#f59e0b' : '#cbd5e1'}
              />
            </button>
          ))}
        </div>

        <div className="review-tags-label">Tags (optional)</div>
        <div className="review-tags">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`review-tag${selectedTags.includes(tag) ? ' selected' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <textarea
          className="review-textarea"
          placeholder="Share a quick note about your experience..."
          value={text}
          maxLength={200}
          rows={3}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="review-char-count">{text.length}/200</div>

        <button
          type="button"
          className="review-submit-btn"
          onClick={submit}
          disabled={rating < 1 || submitting}
        >
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
