import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Eye, Globe, Search, Users } from 'lucide-react';
import { fetchAdminAdViewers, fetchAdminVisitors } from '../../services/adminApi';
import {
  actorDisplayName,
  formatRelativeTime,
  shortVisitorId,
} from '../../utils/adminDisplay';
import {
  ADMIN_LIST_LIMIT,
  createRequestSeq,
  shouldStepBackEmptyPage,
} from '../../utils/adminPaging';
import AdminAvatar from './AdminAvatar';
import AdminPager from './AdminPager';

function StatCard({ label, value, Icon }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-icon">
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <div>
        <div className="admin-stat-value">{value}</div>
        <div className="admin-stat-label">{label}</div>
      </div>
    </div>
  );
}

function ViewerRow({ viewer }) {
  const name = actorDisplayName(viewer);
  return (
    <li className="admin-viewer-row">
      <AdminAvatar user={{ ...viewer, name }} size={32} />
      <div className="admin-viewer-copy">
        <div className="admin-user-name">
          {name}
          {viewer.isVisitor && (
            <span className="admin-visitor-tag">Visitor</span>
          )}
        </div>
        <div className="admin-user-email">
          {viewer.isVisitor
            ? (shortVisitorId(viewer) ? `ID ${shortVisitorId(viewer)}` : 'Not signed in')
            : (viewer.email || 'Signed-in user')}
        </div>
      </div>
      <div className="admin-viewer-meta">
        <span>{viewer.viewCount} {viewer.viewCount === 1 ? 'view' : 'views'}</span>
        <span>{formatRelativeTime(viewer.lastViewedAt)}</span>
      </div>
    </li>
  );
}

const EMPTY_PAGE = {
  page: 1, limit: ADMIN_LIST_LIMIT, total: 0, totalPages: 0, hasMore: false,
};

export default function AdminDashboard({ apiFetch, refreshKey, onError }) {
  const [ads, setAds] = useState([]);
  const [adStats, setAdStats] = useState({ totalViews: 0, uniqueViewers: 0, adsViewed: 0 });
  const [adPage, setAdPage] = useState(1);
  const [adPaging, setAdPaging] = useState(EMPTY_PAGE);
  const [adsLoading, setAdsLoading] = useState(true);

  const [visitors, setVisitors] = useState([]);
  const [visitorStats, setVisitorStats] = useState({ total: 0, signedIn: 0, anonymous: 0 });
  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorPaging, setVisitorPaging] = useState(EMPTY_PAGE);
  const [visitorsLoading, setVisitorsLoading] = useState(true);

  const [adQuery, setAdQuery] = useState('');
  const [visitorFilter, setVisitorFilter] = useState('all');
  const [openAdId, setOpenAdId] = useState(null);
  const adsReq = useRef(createRequestSeq());
  const visitorsReq = useRef(createRequestSeq());

  const loadAds = useCallback(async (pageNum = 1) => {
    const req = adsReq.current.begin();
    setAdsLoading(true);
    try {
      const res = await fetchAdminAdViewers(apiFetch, { page: pageNum, limit: ADMIN_LIST_LIMIT });
      if (!adsReq.current.isCurrent(req)) return;
      if (shouldStepBackEmptyPage(res.ads, pageNum)) {
        setAdPage(pageNum - 1);
        return;
      }
      setAds(res.ads);
      setAdPage(res.page);
      setAdPaging(res);
      setAdStats(res.stats);
      onError('');
    } catch (err) {
      if (!adsReq.current.isCurrent(req)) return;
      setAds([]);
      setAdPaging({ ...EMPTY_PAGE, page: pageNum });
      onError(err.message || 'Could not load ad viewers.');
    } finally {
      if (adsReq.current.isCurrent(req)) setAdsLoading(false);
    }
  }, [apiFetch, onError]);

  const loadVisitors = useCallback(async (pageNum = 1) => {
    const req = visitorsReq.current.begin();
    setVisitorsLoading(true);
    try {
      const res = await fetchAdminVisitors(apiFetch, { page: pageNum, limit: ADMIN_LIST_LIMIT });
      if (!visitorsReq.current.isCurrent(req)) return;
      if (shouldStepBackEmptyPage(res.visitors, pageNum)) {
        setVisitorPage(pageNum - 1);
        return;
      }
      setVisitors(res.visitors);
      setVisitorPage(res.page);
      setVisitorPaging(res);
      setVisitorStats(res.stats);
      onError('');
    } catch (err) {
      if (!visitorsReq.current.isCurrent(req)) return;
      setVisitors([]);
      setVisitorPaging({ ...EMPTY_PAGE, page: pageNum });
      onError(err.message || 'Could not load visitors.');
    } finally {
      if (visitorsReq.current.isCurrent(req)) setVisitorsLoading(false);
    }
  }, [apiFetch, onError]);

  useEffect(() => {
    loadAds(adPage);
  }, [loadAds, adPage, refreshKey]);

  useEffect(() => {
    loadVisitors(visitorPage);
  }, [loadVisitors, visitorPage, refreshKey]);

  const filteredAds = useMemo(() => {
    const q = adQuery.trim().toLowerCase();
    const list = q
      ? ads.filter(ad => ad.title.toLowerCase().includes(q))
      : ads;
    return [...list].sort((a, b) => (b.views - a.views) || (new Date(b.lastViewedAt || 0) - new Date(a.lastViewedAt || 0)));
  }, [ads, adQuery]);

  const filteredVisitors = useMemo(() => {
    let list = visitors;
    if (visitorFilter === 'signed-in') list = list.filter(v => !v.isVisitor);
    if (visitorFilter === 'visitors') list = list.filter(v => v.isVisitor);
    return [...list].sort((a, b) => new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0));
  }, [visitors, visitorFilter]);

  return (
    <div className="admin-dashboard">
      <div className="admin-stats-row">
        <StatCard label="Ad views" value={adStats.totalViews} Icon={Eye} />
        <StatCard label="Listings viewed" value={adStats.adsViewed} Icon={Eye} />
        <StatCard label="Site visitors" value={visitorStats.total} Icon={Globe} />
        <StatCard label="Anonymous visitors" value={visitorStats.anonymous} Icon={Users} />
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <div className="admin-widget-head">
            <div>
              <h2 className="admin-widget-title">Who viewed each ad</h2>
              <p className="admin-widget-sub">Signed-in users by name. Everyone else is listed as Visitor.</p>
            </div>
            <div className="admin-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search listings…"
                value={adQuery}
                onChange={e => setAdQuery(e.target.value)}
              />
            </div>
          </div>

          {adsLoading && ads.length === 0 ? (
            <div className="admin-empty">Loading ad views…</div>
          ) : (
            <>
              {filteredAds.length === 0 ? (
                <div className="admin-empty">No ad views recorded yet.</div>
              ) : (
                <ul className={`admin-ad-view-list${adsLoading ? ' is-busy' : ''}`}>
                  {filteredAds.map((ad) => {
                    const open = openAdId === ad.id;
                    return (
                      <li key={ad.id} className={`admin-ad-view-item${open ? ' is-open' : ''}`}>
                        <button
                          type="button"
                          className="admin-ad-view-toggle"
                          onClick={() => setOpenAdId(open ? null : ad.id)}
                          aria-expanded={open}
                        >
                          {ad.image ? (
                            <img className="admin-ad-thumb" src={ad.image} alt="" />
                          ) : (
                            <div className="admin-ad-thumb admin-ad-thumb-fallback">Ad</div>
                          )}
                          <div className="admin-ad-view-copy">
                            <div className="admin-ad-view-title">{ad.title}</div>
                            <div className="admin-muted">
                              {ad.views} {ad.views === 1 ? 'view' : 'views'} · {ad.uniqueViewers} {ad.uniqueViewers === 1 ? 'person' : 'people'}
                              {ad.lastViewedAt ? ` · ${formatRelativeTime(ad.lastViewedAt)}` : ''}
                            </div>
                          </div>
                          <ChevronDown size={16} className="admin-ad-chevron" />
                        </button>
                        {open && (
                          ad.viewers.length === 0 ? (
                            <div className="admin-empty admin-empty-compact">No viewer details for this listing.</div>
                          ) : (
                            <ul className="admin-viewer-list">
                              {ad.viewers.map((viewer) => (
                                <ViewerRow key={viewer.id} viewer={viewer} />
                              ))}
                            </ul>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <AdminPager
                page={adPaging.page}
                limit={adPaging.limit}
                total={adPaging.total}
                totalPages={adPaging.totalPages}
                hasMore={adPaging.hasMore}
                disabled={adsLoading}
                onPageChange={setAdPage}
              />
            </>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-widget-head">
            <div>
              <h2 className="admin-widget-title">Site visitors</h2>
              <p className="admin-widget-sub">People who opened the web app, including guests.</p>
            </div>
            <div className="admin-filter-pills">
              {[
                { id: 'all', label: 'All' },
                { id: 'signed-in', label: 'Signed in' },
                { id: 'visitors', label: 'Visitors' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`admin-pill${visitorFilter === id ? ' active' : ''}`}
                  onClick={() => setVisitorFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visitorsLoading && visitors.length === 0 ? (
            <div className="admin-empty">Loading visitors…</div>
          ) : (
            <>
              {filteredVisitors.length === 0 ? (
                <div className="admin-empty">No visitors recorded yet.</div>
              ) : (
                <ul className={`admin-visitor-list${visitorsLoading ? ' is-busy' : ''}`}>
                  {filteredVisitors.map((visitor) => {
                    const name = actorDisplayName(visitor);
                    return (
                      <li key={visitor.id} className="admin-visitor-row">
                        <AdminAvatar user={{ ...visitor, name }} />
                        <div className="admin-viewer-copy">
                          <div className="admin-user-name">
                            {name}
                            {visitor.isVisitor && <span className="admin-visitor-tag">Visitor</span>}
                          </div>
                          <div className="admin-user-email">
                            {visitor.isVisitor
                              ? (shortVisitorId(visitor) ? `ID ${shortVisitorId(visitor)}` : 'Not signed in')
                              : visitor.email}
                          </div>
                        </div>
                        <div className="admin-viewer-meta">
                          <span>
                            {visitor.pageViews ? `${visitor.pageViews} pages` : 'Active'}
                            {visitor.adViews ? ` · ${visitor.adViews} ads` : ''}
                          </span>
                          <span>{formatRelativeTime(visitor.lastSeenAt)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <AdminPager
                page={visitorPaging.page}
                limit={visitorPaging.limit}
                total={visitorPaging.total}
                totalPages={visitorPaging.totalPages}
                hasMore={visitorPaging.hasMore}
                disabled={visitorsLoading}
                onPageChange={setVisitorPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
