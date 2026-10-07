import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { dashboardAPI } from '../services/api';
import PageBanner from '../components/common/PageBanner';
import Skeleton from '../components/common/Skeleton';
import { formatCurrency } from '../utils/helpers';

const StatCard = ({ label, value, color, iconWrapClass, icon, accent }) => (
  <div className="card w-full p-4 flex items-center gap-3 group hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
    <div className={`absolute top-0 left-0 w-full h-1 ${accent}`} />
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconWrapClass}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className={`text-3xl font-bold tracking-tight leading-none ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 font-semibold mt-1">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    dashboardAPI.getStats()
      .then((res) => {
        if (!mounted) return;
        setStats(res.data?.stats || {});
        setMessage(res.data?.message || '');
      })
      .catch(() => {
        if (mounted) setMessage('Connect your store API to populate dashboard metrics.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageBanner
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Admin'}!`}
        subtitle="Store metrics synced from the NONSENSE storefront API."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Products"
          value={stats?.products ?? 0}
          color="dash-stat dash-stat-sky"
          iconWrapClass="dash-icon dash-icon-sky"
          accent="bg-sky-500"
          icon={(
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )}
        />
        <StatCard
          label="Orders"
          value={stats?.orders ?? 0}
          color="dash-stat dash-stat-amber"
          iconWrapClass="dash-icon dash-icon-amber"
          accent="bg-amber-500"
          icon={(
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          )}
        />
        <StatCard
          label="Customers"
          value={stats?.customers ?? 0}
          color="dash-stat dash-stat-emerald"
          iconWrapClass="dash-icon dash-icon-emerald"
          accent="bg-emerald-500"
          icon={(
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(stats?.revenue ?? 0)}
          color="dash-stat dash-stat-violet"
          iconWrapClass="dash-icon dash-icon-violet"
          accent="bg-violet-500"
          icon={(
            <svg className="w-6 h-6" viewBox="0 0 320 512" fill="currentColor">
              <path d="M308 96c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v44.748c0 6.627 5.373 12 12 12h85.28c27.308 0 48.261 9.958 60.97 27.252H12c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h158.757c-6.217 36.086-36.075 58.952-72.757 58.952H12c-6.627 0-12 5.373-12 12v53.012c0 3.349 1.4 6.546 3.861 8.818l165.052 152.356a12.001 12.001 0 0 0 8.139 3.182h82.562c10.924 0 16.166-13.408 8.139-20.818L116.871 319.906c76.499-2.34 131.144-53.395 138.318-127.906H308c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-48.19c-3.003-11.891-7.922-23.738-14.932-34H308z" />
            </svg>
          )}
        />
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Store overview</h3>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default Dashboard;
