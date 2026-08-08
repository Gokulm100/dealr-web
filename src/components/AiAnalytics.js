import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  TrendingUp,
  Award,
  Lightbulb,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Eye,
  Clock,
  IndianRupee,
  BarChart3,
} from 'lucide-react';
import {
  GeminiSparkles,
  GeminiGradientText,
  AnalyticsCard,
  GeminiMetricMeter,
} from './geminiBrand';

const CARD_ACCENTS = ['#4285f4', '#9b72cb', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

const CAPABILITIES = [
  { label: 'Performance', Icon: TrendingUp },
  { label: 'Market fit', Icon: Award },
  { label: 'Next steps', Icon: Lightbulb },
];

function accentStyle(index) {
  return { '--aa-accent': CARD_ACCENTS[index % CARD_ACCENTS.length] };
}

function parseMetricNumber(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const pct = s.match(/([\d.]+)\s*%/);
  if (pct) return { num: parseFloat(pct[1]), max: 100 };
  const cleaned = s.replace(/[,₹\s]/g, '');
  const numMatch = cleaned.match(/([\d.]+)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    if (!Number.isFinite(num)) return null;
    return { num, max: null };
  }
  return null;
}

function scoreFromValue(value) {
  const parsed = parseMetricNumber(value);
  if (parsed) {
    const cap = parsed.max ?? Math.max(parsed.num * 1.15, parsed.num);
    if (!Number.isFinite(cap) || cap <= 0) return 8;
    const score = (parsed.num / cap) * 100;
    if (!Number.isFinite(score)) return 8;
    return Math.min(100, Math.max(8, score));
  }
  const lower = String(value).toLowerCase();
  if (/excellent|outstanding|high|strong|great|good|fast/.test(lower)) return 88;
  if (/medium|average|moderate|fair|normal/.test(lower)) return 55;
  if (/low|poor|weak|bad|slow/.test(lower)) return 28;
  let h = 0;
  for (let i = 0; i < lower.length; i += 1) h = (h + lower.charCodeAt(i) * 7) % 45;
  return 42 + h;
}

function getMetricStatus(score) {
  if (score >= 75) return { label: 'Strong', tone: 'strong', color: '#059669' };
  if (score >= 50) return { label: 'Good', tone: 'good', color: '#2563eb' };
  if (score >= 30) return { label: 'Fair', tone: 'fair', color: '#d97706' };
  return { label: 'Needs work', tone: 'low', color: '#dc2626' };
}

function pickMetricIcon(title) {
  const t = String(title || '').toLowerCase();
  if (/price|cost|₹|rupee|value/.test(t)) return IndianRupee;
  if (/view|traffic|reach|impression|click/.test(t)) return Eye;
  if (/time|speed|day|hour|posted|duration/.test(t)) return Clock;
  if (/compet|market|compare|rank|demand/.test(t)) return Award;
  if (/trend|growth|performance/.test(t)) return TrendingUp;
  return BarChart3;
}

function buildGlanceMetrics(insights) {
  return insights.map((insight, idx) => {
    const score = Math.round(scoreFromValue(insight.value));
    return {
      title: insight.title,
      value: insight.value,
      description: insight.description,
      accent: CARD_ACCENTS[idx % CARD_ACCENTS.length],
      score,
      status: getMetricStatus(score),
      Icon: pickMetricIcon(insight.title),
    };
  });
}

function overallFromMetrics(metrics) {
  if (!metrics.length) {
    return { score: 0, status: getMetricStatus(0), headline: 'No metrics yet' };
  }
  const score = Math.round(
    metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length
  );
  const status = getMetricStatus(score);
  const headlines = {
    strong: 'Your listing is performing well',
    good: 'Solid performance with room to grow',
    fair: 'A few tweaks could lift results',
    low: 'Focus on the tips below to improve',
  };
  return { score, status, headline: headlines[status.tone] };
}

function AnalyticsHeader({ onRefresh, showRefresh, subtitle }) {
  return (
    <div className="aa-header">
      <div className="aa-header-main">
        <div className="ai-header">
          <GeminiSparkles />
          <GeminiGradientText className="ai-header-text">AI Analytics</GeminiGradientText>
        </div>
        {subtitle && <p className="aa-header-sub">{subtitle}</p>}
      </div>
      {showRefresh && (
        <button
          type="button"
          className="aa-refresh"
          onClick={onRefresh}
          aria-label="Refresh analytics"
          title="Refresh"
        >
          <RefreshCw size={15} strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}

function AnalyzingState() {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    'Reviewing price signals',
    'Reading market demand',
    'Preparing your insights',
  ];

  useEffect(() => {
    const copyTimer = setInterval(() => {
      setStepIndex((idx) => (idx + 1) % steps.length);
    }, 2800);
    return () => clearInterval(copyTimer);
  }, [steps.length]);

  return (
    <div className="aa-analyze" aria-live="polite" aria-busy="true">
      <div className="aa-analyze-orb" aria-hidden>
        <span className="aa-analyze-orb-ring" />
        <GeminiSparkles size={26} />
      </div>
      <div className="aa-analyze-copy">
        <GeminiGradientText as="h3" className="aa-analyze-title">
          Analyzing your listing
        </GeminiGradientText>
        <p className="aa-analyze-sub" key={stepIndex}>{steps[stepIndex]}</p>
        <div className="aa-analyze-progress" aria-hidden>
          <span className="aa-analyze-progress-fill" />
        </div>
        <div className="aa-analyze-steps" aria-hidden>
          {steps.map((step, i) => (
            <span
              key={step}
              className={`aa-analyze-dot${i === stepIndex ? ' active' : ''}${i < stepIndex ? ' done' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SegmentTabs({ segments, activeKey, onChange }) {
  return (
    <div className="aa-tabs" role="tablist" aria-label="Analytics views">
      {segments.map((seg) => {
        const active = activeKey === seg.key;
        return (
          <button
            key={seg.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`aa-tab${active ? ' active' : ''}`}
            onClick={() => onChange(seg.key)}
          >
            <span className="aa-tab-label">{seg.label}</span>
            {seg.count > 0 && <span className="aa-tab-badge">{seg.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function OverviewStrip({ metrics }) {
  const overall = overallFromMetrics(metrics);
  const strongCount = metrics.filter((m) => m.status.tone === 'strong' || m.status.tone === 'good').length;

  return (
    <div className="aa-overview" style={{ '--aa-accent': overall.status.color }}>
      <div className="aa-overview-score">
        <span className="aa-overview-num">{overall.score}</span>
        <span className="aa-overview-denom">/100</span>
      </div>
      <div className="aa-overview-copy">
        <span className={`aa-overview-status aa-tone--${overall.status.tone}`}>
          {overall.status.label}
        </span>
        <p className="aa-overview-headline">{overall.headline}</p>
        <p className="aa-overview-meta">
          {strongCount} of {metrics.length} metrics looking healthy
        </p>
      </div>
      <div className="aa-overview-meter" aria-hidden>
        <GeminiMetricMeter score={overall.score} className="aa-overview-meter-bar" />
      </div>
    </div>
  );
}

function MetricRow({ metric, insight, open, onToggle, index }) {
  const { Icon, title, value, accent, score, status } = metric;
  const panelId = `aa-metric-panel-${index}`;

  return (
    <div
      className={`aa-metric-row${open ? ' open' : ''}`}
      style={{ '--aa-accent': accent, animationDelay: `${index * 60}ms` }}
    >
      <button
        type="button"
        className="aa-metric-row-btn"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="aa-metric-row-icon" aria-hidden>
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <span className="aa-metric-row-main">
          <span className="aa-metric-row-title">{title}</span>
          <span className="aa-metric-row-value">{value}</span>
        </span>
        <span className="aa-metric-row-side">
          <span className={`aa-tone-dot aa-tone--${status.tone}`} aria-hidden />
          <span className={`aa-metric-row-status aa-tone--${status.tone}`}>{status.label}</span>
          <ChevronDown size={16} className="aa-metric-row-chevron" aria-hidden />
        </span>
        <span className="aa-metric-row-meter" aria-hidden>
          <GeminiMetricMeter score={score} />
        </span>
      </button>
      <div
        id={panelId}
        className="aa-metric-row-panel"
        hidden={!open}
        role="region"
        aria-label={`${title} analysis`}
      >
        {insight?.description ? (
          <p className="aa-metric-row-desc">{insight.description}</p>
        ) : (
          <p className="aa-metric-row-desc aa-muted">No further detail for this metric.</p>
        )}
      </div>
    </div>
  );
}

function MetricExplorer({ insights }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const metrics = buildGlanceMetrics(insights);

  useEffect(() => {
    if (selectedIdx === null) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedIdx(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedIdx]);

  if (!insights.length) {
    return <p className="aa-muted">No metrics available yet.</p>;
  }

  return (
    <div className="aa-metrics">
      <OverviewStrip metrics={metrics} />
      <div className="aa-metrics-list">
        {metrics.map((metric, idx) => (
          <MetricRow
            key={`${metric.title}-${idx}`}
            metric={metric}
            insight={insights[idx]}
            index={idx}
            open={selectedIdx === idx}
            onToggle={() => setSelectedIdx((prev) => (prev === idx ? null : idx))}
          />
        ))}
      </div>
    </div>
  );
}

function TipsList({ suggestions }) {
  const [expandedIdx, setExpandedIdx] = useState(0);

  if (!suggestions.length) return null;

  return (
    <div className="aa-tips-list">
      {suggestions.map((tip, idx) => {
        const open = expandedIdx === idx;
        const priority = idx === 0 ? 'high' : 'next';
        return (
          <div
            key={idx}
            className={`aa-tip${open ? ' open' : ''}`}
            style={{ ...accentStyle(idx), animationDelay: `${idx * 50}ms` }}
          >
            <button
              type="button"
              className="aa-tip-toggle"
              onClick={() => setExpandedIdx(open ? -1 : idx)}
              aria-expanded={open}
            >
              <span className="aa-tip-index" aria-hidden>{idx + 1}</span>
              <span className="aa-tip-copy">
                <span className={`aa-tip-badge ${priority}`}>
                  {priority === 'high' ? 'High impact' : 'Recommended'}
                </span>
                <span className="aa-tip-title">{tip.title}</span>
              </span>
              <ChevronDown size={16} className="aa-tip-chevron" aria-hidden />
            </button>
            {open && !!tip.description && (
              <p className="aa-tip-body">{tip.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AiAnalytics({ ad, listing, apiFetch: apiFetchProp }) {
  const { apiFetch: ctxApiFetch } = useApp();
  const apiFetch = apiFetchProp || ctxApiFetch;
  const item = ad || listing;
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [insights, setInsights] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('metrics');

  const handleGenerate = async () => {
    if (!item || !apiFetch) return;
    setLoading(true);
    setGenerated(true);
    setError(null);
    try {
      const res = await apiFetch('/api/ai/provideAiAnalytics', {
        method: 'POST',
        body: JSON.stringify({
          adId: item.id || item._id || '',
          category: item.categoryId || item.category || '',
          subCategory: item.subCategory || '',
        }),
      });
      const payload = res.data ?? res;
      setInsights(Array.isArray(payload?.analysis) ? payload.analysis : []);
      setSuggestions(Array.isArray(payload?.recommendations) ? payload.recommendations : []);
      setActiveTab('metrics');
    } catch {
      setError('Could not load AI analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!generated) {
    return (
      <AnalyticsCard className="aa-analytics--idle">
        <div className="aa-idle-accent" aria-hidden />
        <AnalyticsHeader subtitle="Owner insights for this listing" />
        <p className="aa-lead">
          See how your listing compares in the market, then get clear moves to sell faster.
        </p>
        <ul className="aa-capabilities">
          {CAPABILITIES.map(({ label, Icon }) => (
            <li key={label} className="aa-capability">
              <Icon size={14} strokeWidth={2.25} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
        <button type="button" className="aa-generate-btn" onClick={handleGenerate}>
          <Sparkles size={16} strokeWidth={2.25} />
          Generate insights
        </button>
      </AnalyticsCard>
    );
  }

  if (loading) {
    return (
      <AnalyticsCard>
        <AnalyticsHeader />
        <AnalyzingState />
      </AnalyticsCard>
    );
  }

  if (error) {
    return (
      <AnalyticsCard>
        <AnalyticsHeader onRefresh={handleGenerate} showRefresh />
        <div className="aa-error" role="alert">
          <AlertCircle size={20} strokeWidth={2} />
          <div>
            <p className="aa-error-title">Couldn&apos;t load analytics</p>
            <p className="aa-muted">{error}</p>
          </div>
        </div>
        <button type="button" className="aa-generate-btn aa-generate-btn--secondary" onClick={handleGenerate}>
          <RefreshCw size={16} strokeWidth={2.25} />
          Try again
        </button>
      </AnalyticsCard>
    );
  }

  const segments = [
    { key: 'metrics', label: 'Metrics', count: insights.length },
    { key: 'tips', label: 'Tips', count: suggestions.length },
  ];

  return (
    <AnalyticsCard className="aa-analytics--ready">
      <AnalyticsHeader
        onRefresh={handleGenerate}
        showRefresh
        subtitle="Updated for this listing"
      />

      <SegmentTabs segments={segments} activeKey={activeTab} onChange={setActiveTab} />

      <div className="aa-panel">
        {activeTab === 'metrics' ? (
          <MetricExplorer insights={insights} />
        ) : suggestions.length > 0 ? (
          <TipsList suggestions={suggestions} />
        ) : (
          <p className="aa-muted">No tips for this listing right now.</p>
        )}
      </div>
    </AnalyticsCard>
  );
}
