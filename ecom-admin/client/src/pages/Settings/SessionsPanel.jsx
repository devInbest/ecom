import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';

const apiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

const formatRelative = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const SessionsPanel = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revoke = async (id, isCurrent) => {
    try {
      if (isCurrent) {
        await authAPI.logout();
        window.location.href = '/login';
        return;
      }
      await authAPI.revokeSession(id);
      toast.success('Session revoked');
      loadSessions();
    } catch (err) {
      toast.error(apiError(err, 'Failed to revoke session'));
    }
  };

  const revokeOthers = async () => {
    try {
      await authAPI.revokeAllSessions();
      toast.success('All other sessions revoked');
      loadSessions();
    } catch (err) {
      toast.error(apiError(err, 'Failed to revoke sessions'));
    }
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Active sessions</h3>
        {sessions.length > 1 && (
          <button type="button" className="btn-secondary text-sm" onClick={revokeOthers}>
            Revoke others
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No active sessions.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {sessions.map((s) => (
            <div key={s._id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {s.browser || 'Unknown browser'}
                  {s.isCurrent && (
                    <span className="ml-2 text-xs font-normal text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  Last active: {formatRelative(s.lastUsedAt)}
                  {s.ipAddress ? ` · ${s.ipAddress}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => revoke(s._id, s.isCurrent)}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionsPanel;
