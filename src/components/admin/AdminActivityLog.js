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
  const chunkCacheRef = useRef({
    type: null,
    backendSize: 0,
    chunks: {},
    total: 0,
    hasMore: false,
  });

  const load = useCallback(async (uiPage = 1, typeFilter = type) => {
    const req = reqSeq.current.begin();
    const limit = ADMIN_ACTIVITY_LIMIT;
    setLoading(true);
    try {
      const cache = chunkCacheRef.current;
      if (cache.type !== typeFilter) {
        chunkCacheRef.current = {
          type: typeFilter,
          backendSize: 0,
          chunks: {},
          total: 0,
          hasMore: false,
        };
      }

      const applySlice = (slice, meta, pageNum) => {
        if (!reqSeq.current.isCurrent(req)) return;
        if (shouldStepBackEmptyPage(slice, pageNum)) {
          setPage(pageNum - 1);
          return;
        }
        const total = Number(meta.total) || 0;
        const backendSize = chunkCacheRef.current.backendSize || limit;
        const totalPages = total > 0
          ? Math.ceil(total / limit)
          : (Number(meta.totalPages) > 0
            ? Math.ceil((Number(meta.totalPages) * backendSize) / limit)
            : 0);
        const hasMore = total > 0
          ? pageNum * limit < total
          : (slice.length >= limit || Boolean(meta.hasMore));
        setLogs(slice.slice(0, limit));
        setPaging({
          page: pageNum,
          limit,
          total,
          totalPages,
          hasMore,
        });
        onError('');
      };

      const fetchBackendPage = (backendPage) => fetchAdminActivityLog(apiFetch, {
        page: backendPage,
        limit,
        type: typeFilter,
      });

      if (!chunkCacheRef.current.backendSize) {
        const probe = await fetchBackendPage(1);
        if (!reqSeq.current.isCurrent(req)) return;
        const rows = probe.logs || [];
        chunkCacheRef.current.total = probe.total;
        chunkCacheRef.current.hasMore = probe.hasMore;
        chunkCacheRef.current.totalPages = probe.totalPages;
        if (rows.length <= limit) {
          chunkCacheRef.current.backendSize = limit;
          chunkCacheRef.current.chunks[1] = rows;
          if (uiPage === 1) {
            applySlice(rows, probe, 1);
            return;
          }
        } else {
          chunkCacheRef.current.backendSize = rows.length;
          chunkCacheRef.current.chunks[1] = rows;
          if (uiPage === 1) {
            applySlice(rows.slice(0, limit), probe, 1);
            return;
          }
        }
      }

      const backendSize = chunkCacheRef.current.backendSize || limit;

      if (backendSize <= limit) {
        let rows = chunkCacheRef.current.chunks[uiPage];
        let meta = chunkCacheRef.current;
        if (!rows) {
          const res = await fetchBackendPage(uiPage);
          if (!reqSeq.current.isCurrent(req)) return;
          rows = res.logs || [];
          chunkCacheRef.current.chunks[uiPage] = rows;
          chunkCacheRef.current.total = res.total;
          chunkCacheRef.current.hasMore = res.hasMore;
          meta = res;
        }
        applySlice(rows, meta, uiPage);
        return;
      }

      const backendPage = Math.floor((uiPage - 1) * limit / backendSize) + 1;
      const offset = ((uiPage - 1) * limit) % backendSize;
      let chunk = chunkCacheRef.current.chunks[backendPage];
      let meta = chunkCacheRef.current;
      if (!chunk) {
        const res = await fetchBackendPage(backendPage);
        if (!reqSeq.current.isCurrent(req)) return;
        chunk = res.logs || [];
        chunkCacheRef.current.chunks[backendPage] = chunk;
        chunkCacheRef.current.total = res.total;
        chunkCacheRef.current.hasMore = res.hasMore;
        meta = res;
      }
      applySlice(chunk.slice(offset, offset + limit), meta, uiPage);
    } catch (err) {
      if (!reqSeq.current.isCurrent(req)) return;
      setLogs([]);
      setPaging({
        page: uiPage, limit, total: 0, totalPages: 0, hasMore: false,
      });
      onError(err.message || 'Could not load activity log.');
    } finally {
      if (reqSeq.current.isCurrent(req)) setLoading(false);
    }
  }, [apiFetch, type, onError]);

  useEffect(() => {
    chunkCacheRef.current = {
      type: null,
      backendSize: 0,
      chunks: {},
      total: 0,
      hasMore: false,
    };
  }, [type, refreshKey]);

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
              {filtered.slice(0, ADMIN_ACTIVITY_LIMIT).map((log) => {
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
