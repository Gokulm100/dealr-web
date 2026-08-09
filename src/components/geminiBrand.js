import React from 'react';
import { Sparkles } from 'lucide-react';

export const GEMINI = {
  blue: '#4285f4',
  purple: '#9b72cb',
  rose: '#d96570',
  border: 'rgba(155, 114, 203, 0.18)',
  rowBorder: 'rgba(155, 114, 203, 0.1)',
};

export const GEMINI_GRADIENT_ID = 'gemini-analytics-gradient';

export function GeminiAnalyticsDefs() {
  return (
    <svg width="0" height="0" className="ai-summary-gradient-defs" aria-hidden>
      <defs>
        <linearGradient id={GEMINI_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GEMINI.blue} />
          <stop offset="45%" stopColor={GEMINI.purple} />
          <stop offset="100%" stopColor={GEMINI.rose} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GeminiSparkles({ size = 18, className = '', strokeWidth = 2.25 }) {
  return (
    <Sparkles
      size={size}
      strokeWidth={strokeWidth}
      className={`ai-icon-gemini ${className}`.trim()}
      color={`url(#${GEMINI_GRADIENT_ID})`}
      aria-hidden
    />
  );
}

export function GeminiGradientText({ as: Tag = 'span', className = '', children }) {
  return (
    <Tag className={`ai-header-text ${className}`.trim()}>
      {children}
    </Tag>
  );
}

export function GeminiScoreBar({ score, className = '' }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className={`aa-score-bar ${className}`.trim()} role="presentation">
      <div className="aa-score-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function GeminiMetricMeter({ score, className = '' }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className={`aa-metric-meter ${className}`.trim()} aria-hidden>
      <div className="aa-metric-meter-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AnalyticsCard({ className = '', children }) {
  return (
    <div className={`ai-summary-card aa-analytics ${className}`.trim()}>
      <GeminiAnalyticsDefs />
      {children}
    </div>
  );
}
