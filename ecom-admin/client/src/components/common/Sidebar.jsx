import { cloneElement } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logoGold from '../../../assets/nonsense-logo-gold.svg';
import logoWhite from '../../../assets/nonsense-logo-dark.svg';
import { useAuth } from '../../hooks/useAuth';
import { roleLabel } from '../../utils/helpers';

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/categories',
    label: 'Categories',
    permission: 'category:read',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    to: '/subcategories',
    label: 'Subcategories',
    permission: 'subcategory:read',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 12h10M4 18h7" />
      </svg>
    ),
  },
  {
    to: '/products',
    label: 'Products',
    permission: 'product:read',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Orders',
    permission: 'order:read',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const Sidebar = ({ isOpen = true }) => {
  const { user, avatarPreview } = useSelector((state) => state.auth);
  const { hasPermission } = useAuth();
  const showPhoto = Boolean(user?.hasAvatar && avatarPreview);
  const visibleNav = navItems.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside
      className={`bg-gradient-to-br from-[#0B1849] via-[#0f2058] to-[#124D1C] text-[#EBEDE3] flex flex-col h-full transition-[width] duration-300 ease-in-out will-change-[width] ${isOpen ? 'w-64' : 'w-20'
        }`}
    >
      <div
        className={`sidebar-brand h-14 box-border flex items-center justify-center border-b border-white/15 shrink-0 ${
          isOpen ? 'px-3' : 'px-2'
        }`}
      >
        <Link
          to="/"
          title="Go to Dashboard"
          aria-label="Go to Dashboard"
          className="inline-flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E4B028]/80"
        >
          <img
            src={isOpen ? logoGold : logoWhite}
            alt="NONSENSE Admin"
            className={`sidebar-brand-logo object-contain object-center transition-[height,width] duration-200 ${
              isOpen ? 'h-8 w-auto max-w-[9.5rem]' : 'h-8 w-8'
            }`}
            decoding="async"
          />
        </Link>
      </div>

      <nav className={`flex-1 py-4 space-y-1 ${isOpen ? 'px-3' : 'px-2'}`}>
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={!isOpen ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-md font-medium transition-colors ${isOpen ? 'gap-3 justify-start px-3 py-2' : 'justify-center px-2 py-2.5'
              } ${isActive
                ? 'bg-[#E4B028] text-[#0B1849] shadow-md shadow-black/20'
                : 'text-[#EBEDE3]/90 hover:bg-white/10 hover:text-[#EBEDE3]'
              }`
            }
          >
            {cloneElement(item.icon, {
              className: `${isOpen ? 'w-5 h-5' : 'w-7 h-7'} flex-shrink-0`,
            })}
            {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`py-4 border-t border-white/15 ${isOpen ? 'px-4' : 'px-2'}`}>
        <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`} title={!isOpen ? user?.name : undefined}>
          <div className="sidebar-user-avatar text-lg font-semibold">
            {showPhoto ? (
              <img src={avatarPreview} alt={user?.name || 'Profile'} />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-md font-medium text-[#EBEDE3] truncate">{user?.name}</p>
              <p className="sidebar-user-role text-sm truncate">{roleLabel(user?.role)}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
