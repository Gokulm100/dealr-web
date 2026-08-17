import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Globe,
  LogIn,
  LogOut,
  MessageCircle,
  Pencil,
  PlusCircle,
  Search,
  Flag,
  FileText,
} from 'lucide-react';
import { fetchAdminActivityLog } from '../../services/adminApi';
import {
  activityMessage,
  actorDisplayName,
  formatAdminDateTime,
  formatRelativeTime,
  pageLabel,
  shortVisitorId,
} from '../../utils/adminDisplay';
import {
  ADMIN_ACTIVITY_LIMIT,
  createRequestSeq,
  shouldStepBackEmptyPage,
} from '../../utils/adminPaging';
import AdminAvatar from './AdminAvatar';
import AdminPager from './AdminPager';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'visit', label: 'Visits' },
  { id: 'ad_view', label: 'Ad views' },
  { id: 'search', label: 'Searches' },
  { id: 'post_ad', label: 'Posts' },
  { id: 'chat', label: 'Chats' },
  { id: 'login', label: 'Sign-ins' },
];

function TypeIcon({ type }) {
  const props = { size: 14, strokeWidth: 2.25 };
  if (type === 'ad_view' || type === 'page_view') return <Eye {...props} />;
  if (type === 'visit') return <Globe {...props} />;
  if (type === 'login') return <LogIn {...props} />;
  if (type === 'logout') return <LogOut {...props} />;
  if (type === 'post_ad') return <PlusCircle {...props} />;
  if (type === 'edit_ad') return <Pencil {...props} />;
  if (type === 'search') return <Search {...props} />;
  if (type === 'chat') return <MessageCircle {...props} />;
  if (type === 'report') return <Flag {...props} />;
  return <FileText {...props} />;
}

export default function AdminActivityLog({ apiFetch, refreshKey, onError }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [paging, setPaging] = useState({
    page: 1, limit: ADMIN_ACTIVITY_LIMIT, total: 0, totalPages: 0, hasMore: false,
  });
  const reqSeq = useRef(createRequestSeq());

  const load = useCallback(async (pageNum = 1, typeFilter = type) => {
    const req = reqSeq.current.begin();
    setLoading(true);
    try {
      const res = await fetchAdminActivityLog(apiFetch, {
        page: pageNum,
        limit: ADMIN_ACTIVITY_LIMIT,
        type: typeFilter,
      });
      if (!reqSeq.current.isCurrent(req)) return;
      if (shouldStepBackEmptyPage(res.logs, pageNum)) {
        setPage(pageNum - 1);
        return;
      }
      setLogs(res.logs);
      setPage(res.page);
      setPaging({
        page: res.page,
        limit: ADMIN_ACTIVITY_LIMIT,
        total: res.total,
        totalPages: res.totalPages,
        hasMore: res.hasMore,
      });
      onError('');
    } catch (err) {
      if (!reqSeq.current.isCurrent(req)) return;
      setLogs([]);
      setPaging({
        page: pageNum, limit: ADMIN_ACTIVITY_LIMIT, total: 0, totalPages: 0, hasMore: false,
      });
      onError(err.message || 'Could not load activity log.');
    } finally {
      if (reqSeq.current.isCurrent(req)) setLoading(false);
    }
  }, [apiFetch, type, onError]);

  useEffect(() => {
    load(page, type);
  }, [load, page, type, refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const hay = [
        actorDisplayName(log),
        log.email,
        log.adTitle,
        log.detail,
        log.type,
        activityMessage(log),
        pageLabel(log.page),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [logs, query]);

  return (
    <section className="admin-card">
      <div className="admin-toolbar admin-log-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search activity…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="admin-filter-pills">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`admin-pill${type === id ? ' active' : ''}`}
              onClick={() => {
                setType(id);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="admin-empty">Loading activity…</div>
      ) : (
        <>
          <AdminPager
            page={paging.page}
            limit={ADMIN_ACTIVITY_LIMIT}
            total={paging.total}
            totalPages={paging.totalPages}
            hasMore={paging.hasMore}
            disabled={loading}
            onPageChange={setPage}
          />
          {filtered.length === 0 ? (
            <div className="admin-empty">No activity to show.</div>
          ) : (
            <ol className={`admin-log-list${loading ? ' is-busy' : ''}`}>
              {filtered.map((log) => {
                const name = actorDisplayName(log);
                return (
                  <li key={log.id} className="admin-log-row">
                    <div className={`admin-log-type is-${log.type || 'activity'}`}>
                      <TypeIcon type={log.type} />
                    </div>
                    <AdminAvatar user={{ ...log, name }} size={36} />
                    <div className="admin-log-copy">
                      <div className="admin-log-message">{activityMessage(log)}</div>
                      <div className="admin-muted">
                        {name}
                        {log.isVisitor && shortVisitorId(log) ? ` · ID ${shortVisitorId(log)}` : ''}
                        {log.adTitle ? ` · ${log.adTitle}` : ''}
                        {log.page ? ` · ${pageLabel(log.page)}` : ''}
                      </div>
                    </div>
                    <time className="admin-log-time" dateTime={log.createdAt || undefined} title={formatAdminDateTime(log.createdAt)}>
                      {formatRelativeTime(log.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
          <AdminPager
            page={paging.page}
            limit={ADMIN_ACTIVITY_LIMIT}
            total={paging.total}
            totalPages={paging.totalPages}
            hasMore={paging.hasMore}
            disabled={loading}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}
