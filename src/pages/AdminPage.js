import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Users,
  Flag,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  fetchAdminUsers,
  fetchAdminReports,
  setUserActive,
  updateReportStatus,
} from '../services/adminApi';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminActivityLog from '../components/admin/AdminActivityLog';
import AdminAvatar from '../components/admin/AdminAvatar';

function UserAvatar({ user }) {
  return <AdminAvatar user={user} />;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminPage() {
  const { user, apiFetch, navigate, showToast, showModal } = useApp();
  const [tab, setTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [apiError, setApiError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [reportFilter, setReportFilter] = useState('pending');
  const [insightRefresh, setInsightRefresh] = useState(0);

  const isAdmin = !!(user?.isAdmin);

  const changeTab = (next) => {
    setApiError('');
    setTab(next);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = await fetchAdminUsers(apiFetch);
      setUsers(data);
    } catch (err) {
      setUsers([]);
      setApiError(err.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = await fetchAdminReports(apiFetch, reportFilter);
      setReports(data);
    } catch (err) {
      setReports([]);
      setApiError(err.message || 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, reportFilter]);

  const refresh = useCallback(() => {
    if (tab === 'users') loadUsers();
    else if (tab === 'reports') loadReports();
    else {
      setApiError('');
      setInsightRefresh(n => n + 1);
    }
  }, [tab, loadUsers, loadReports]);

  useEffect(() => {
    if (!user) {
      navigate('profile');
      return;
    }
    if (!isAdmin) {
      showToast('Admin access required.', 'error');
      navigate('home');
    }
  }, [user, isAdmin, navigate, showToast]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'users') loadUsers();
    else if (tab === 'reports') loadReports();
    else setLoading(false);
  }, [tab, isAdmin, loadUsers, loadReports]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    fetchAdminUsers(apiFetch)
      .then((data) => { if (!cancelled) setUsers(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAdmin, apiFetch]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (userFilter === 'active') list = list.filter(u => u.isActive);
    if (userFilter === 'inactive') list = list.filter(u => !u.isActive);
    const q = userSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, userFilter, userSearch]);

  const pendingReportCount = useMemo(
    () => reports.filter(r => r.status === 'pending').length,
    [reports]
  );

  const handleToggleUser = (targetUser, activate) => {
    const label = activate ? 'activate' : 'deactivate';
    showModal(
      activate ? 'Activate user' : 'Deactivate user',
      `${activate ? 'Restore access for' : 'Suspend'} "${targetUser.name}" (${targetUser.email})?`,
      activate ? '✅' : '⚠️',
      async () => {
        setActionId(targetUser.id);
        try {
          await setUserActive(apiFetch, targetUser.id, activate);
          showToast(`User ${label}d.`, 'success');
          await loadUsers();
        } catch {
          showToast(`Failed to ${label} user.`, 'error');
        } finally {
          setActionId(null);
        }
      }
    );
  };

  const handleReportAction = (report, status) => {
    const labels = {
      resolved: 'Mark as resolved',
      dismissed: 'Dismiss report',
    };
    showModal(
      labels[status] || 'Update report',
      `Apply "${status}" to this report about ${report.targetUserName}?`,
      status === 'dismissed' ? '📋' : '✅',
      async () => {
        setActionId(report.id);
        try {
          await updateReportStatus(apiFetch, report.id, status);
          showToast('Report updated.', 'success');
          await loadReports();
        } catch {
          showToast('Failed to update report.', 'error');
        } finally {
          setActionId(null);
        }
      }
    );
  };

  const handleDeactivateFromReport = (report) => {
    if (!report.targetUserId) {
      showToast('No linked user on this report.', 'error');
      return;
    }
    showModal(
      'Deactivate reported user',
      `Deactivate "${report.targetUserName}" based on this report?`,
      '⚠️',
      async () => {
        setActionId(report.id);
        try {
          await setUserActive(apiFetch, report.targetUserId, false);
          await updateReportStatus(apiFetch, report.id, 'action_taken', 'User deactivated by admin');
          showToast('User deactivated and report updated.', 'success');
          if (tab === 'users') await loadUsers();
          await loadReports();
        } catch {
          showToast('Action failed.', 'error');
        } finally {
          setActionId(null);
        }
      }
    );
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="admin-page">
      <header className="messages-page-header admin-page-header">
        <div className="admin-header-icon">
          <Shield size={22} />
        </div>
        <div>
          <h1 className="messages-page-title">Admin panel</h1>
          <p className="messages-page-subtitle">
            Dashboard, visitors, activity, users, and reports.
          </p>
        </div>
        <button type="button" className="admin-refresh-btn" onClick={refresh} disabled={loading} aria-label="Refresh">
          <RefreshCw size={18} className={loading ? 'admin-spin' : ''} />
        </button>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${tab === 'dashboard' ? ' active' : ''}`}
          onClick={() => changeTab('dashboard')}
        >
          <LayoutGrid size={16} /> Dashboard
        </button>
        <button
          type="button"
          className={`admin-tab${tab === 'users' ? ' active' : ''}`}
          onClick={() => changeTab('users')}
        >
          <Users size={16} /> Users
          <span className="admin-tab-count">{users.length}</span>
        </button>
        <button
          type="button"
          className={`admin-tab${tab === 'reports' ? ' active' : ''}`}
          onClick={() => changeTab('reports')}
        >
          <Flag size={16} /> Reports
          {pendingReportCount > 0 && (
            <span className="admin-tab-badge">{pendingReportCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-tab${tab === 'activity' ? ' active' : ''}`}
          onClick={() => changeTab('activity')}
        >
          <List size={16} /> Activity
        </button>
      </div>

      {apiError && (
        <div className="admin-api-notice">
          <AlertTriangle size={18} />
          <div>
            <strong>Could not reach admin API</strong>
            <p>{apiError}</p>
            <p className="admin-api-hint">
              Ensure the backend exposes POST routes: /api/admin/getUsers, setUserActive, getReports, updateReport, getAdViewers, getVisitors, getActivityLog, and POST /api/analytics/track.
            </p>
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <AdminDashboard
          apiFetch={apiFetch}
          refreshKey={insightRefresh}
          onError={setApiError}
        />
      )}

      {tab === 'activity' && (
        <AdminActivityLog
          apiFetch={apiFetch}
          refreshKey={insightRefresh}
          onError={setApiError}
        />
      )}

      {tab === 'users' && (
        <section className="admin-card">
          <div className="admin-toolbar">
            <div className="admin-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <div className="admin-filter-pills">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`admin-pill${userFilter === id ? ' active' : ''}`}
                  onClick={() => setUserFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="admin-empty">Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty">No users match your filters.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Reports</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="admin-user-cell">
                          <UserAvatar user={u} />
                          <div>
                            <div className="admin-user-name">
                              {u.name}
                              {u.isAdmin && <span className="admin-role-tag">Admin</span>}
                            </div>
                            <div className="admin-user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status ${u.isActive ? 'active' : 'inactive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="admin-muted">{formatDate(u.createdAt)}</td>
                      <td className="admin-muted">{u.reportCounter>0 ? u.reportCounter : '—'}</td>
                      <td>
                        <div className="admin-row-actions">
                          {u.isActive ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              disabled={actionId === u.id || u.isAdmin}
                              onClick={() => handleToggleUser(u, false)}
                              title={u.isAdmin ? 'Cannot deactivate admins' : 'Deactivate'}
                            >
                              <UserX size={14} /> Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn-success"
                              disabled={actionId === u.id}
                              onClick={() => handleToggleUser(u, true)}
                            >
                              <UserCheck size={14} /> Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'reports' && (
        <section className="admin-card">
          <div className="admin-toolbar">
            <div className="admin-filter-pills">
              {[
                { id: 'pending', label: 'Pending' },
                { id: 'all', label: 'All' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`admin-pill${reportFilter === id ? ' active' : ''}`}
                  onClick={() => setReportFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="admin-empty">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="admin-empty">No reports to show.</div>
          ) : (
            <div className="admin-reports-list">
              {reports.map(report => (
                <article key={report.id} className="admin-report-card">
                  <div className="admin-report-head">
                    <span className={`admin-status report-${report.status}`}>
                      {report.status}
                    </span>
                    <span className="admin-muted">{formatDate(report.createdAt)}</span>
                  </div>
                  <h3 className="admin-report-reason">{report.reason}</h3>
                  {report.description && (
                    <p className="admin-report-desc">{report.description}</p>
                  )}
                  <div className="admin-report-meta">
                    <div>
                      <span className="admin-meta-label">Reporter</span>
                      <span>{report.reporterName}</span>
                      {report.reporterEmail && (
                        <span className="admin-muted"> · {report.reporterEmail}</span>
                      )}
                    </div>
                    <div>
                      <span className="admin-meta-label">Reported user</span>
                      <span>{report.targetUserName}</span>
                    </div>
                    {report.adTitle && (
                      <div>
                        <span className="admin-meta-label">Listing</span>
                        <span>{report.adTitle}</span>
                      </div>
                    )}
                  </div>
                  {report.status === 'pending' && (
                    <div className="admin-report-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        disabled={actionId === report.id}
                        onClick={() => handleReportAction(report, 'dismissed')}
                      >
                        <XCircle size={14} /> Dismiss
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-success"
                        disabled={actionId === report.id}
                        onClick={() => handleReportAction(report, 'resolved')}
                      >
                        <CheckCircle size={14} /> Resolve
                      </button>
                      {report.targetUserId && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          disabled={actionId === report.id}
                          onClick={() => handleDeactivateFromReport(report)}
                        >
                          <UserX size={14} /> Deactivate user
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
