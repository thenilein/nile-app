import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, UtensilsCrossed, Tag, ShoppingBag, Users,
    Ticket, BarChart3, Settings, ScrollText, Bell, LogOut,
    Menu as MenuIcon, X, ChevronRight, IceCream2, Zap,
    Moon, Sun, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import './admin.css';

const NAV_SECTIONS = [
    {
        label: 'Overview',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', color: '#6366f1' },
        ]
    },
    {
        label: 'Catalog',
        items: [
            { label: 'Menu Items', icon: UtensilsCrossed, path: '/admin/menu', color: '#f59e0b' },
            { label: 'Categories', icon: Tag, path: '/admin/categories', color: '#ec4899' },
        ]
    },
    {
        label: 'Sales',
        items: [
            { label: 'Orders', icon: ShoppingBag, path: '/admin/orders', color: '#06b6d4' },
            { label: 'Customers', icon: Users, path: '/admin/users', color: '#10b981' },
            { label: 'Promotions', icon: Ticket, path: '/admin/promotions', color: '#f97316' },
        ]
    },
    {
        label: 'Insights',
        items: [
            { label: 'Analytics', icon: BarChart3, path: '/admin/analytics', color: '#8b5cf6' },
        ]
    },
    {
        label: 'System',
        items: [
            { label: 'Settings', icon: Settings, path: '/admin/settings', color: '#64748b' },
            { label: 'Audit Logs', icon: ScrollText, path: '/admin/logs', color: '#94a3b8' },
        ]
    },
];

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { notifications, unreadCount, markAllRead, refreshNotifications } = useAdmin();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const [dark, setDark] = useState(() => localStorage.getItem('admin_dark') === 'true');
    const [searchFocused, setSearchFocused] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.documentElement.setAttribute('data-admin-theme', dark ? 'dark' : 'light');
        localStorage.setItem('admin_dark', String(dark));
    }, [dark]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifs(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const handleNotifClick = async () => {
        const next = !showNotifs;
        setShowNotifs(next);
        if (next) {
            await refreshNotifications();
            setTimeout(markAllRead, 2000);
        }
    };

    const currentPageLabel = NAV_SECTIONS
        .flatMap(s => s.items)
        .find(i => location.pathname === i.path)?.label || 'Admin';

    return (
        <div className={`admin-root ${dark ? 'admin-dark' : 'admin-light'}`}>
            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Sidebar ── */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
                {/* Brand */}
                <div className="admin-brand">
                    <div className="admin-brand__logo">
                        <IceCream2 className="w-5 h-5" />
                    </div>
                    <div className="admin-brand__text">
                        <span className="admin-brand__name">Nile Admin</span>
                        <span className="admin-brand__sub">Ice Creams Control</span>
                    </div>
                    <button className="admin-sidebar__close md:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="admin-nav">
                    {NAV_SECTIONS.map(section => (
                        <div key={section.label} className="admin-nav__section">
                            <span className="admin-nav__section-label">{section.label}</span>
                            {section.items.map(({ label, icon: Icon, path, color }) => (
                                <NavLink
                                    key={path}
                                    to={path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `admin-nav__item ${isActive ? 'admin-nav__item--active' : ''}`
                                    }
                                    style={({ isActive }) => isActive ? { '--nav-accent': color } as any : {}}
                                >
                                    <span className="admin-nav__icon" style={{ color }}>
                                        <Icon className="w-4 h-4" />
                                    </span>
                                    <span className="admin-nav__label">{label}</span>
                                    <ChevronRight className="admin-nav__arrow w-3 h-3" />
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Sidebar footer */}
                <div className="admin-sidebar__footer">
                    <button onClick={() => setDark(d => !d)} className="admin-sidebar__footer-btn">
                        {dark
                            ? <><Sun className="w-4 h-4" /><span>Light Mode</span></>
                            : <><Moon className="w-4 h-4" /><span>Dark Mode</span></>
                        }
                    </button>
                    <button onClick={handleLogout} className="admin-sidebar__footer-btn admin-sidebar__footer-btn--danger">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className="admin-main">
                {/* Topbar */}
                <header className="admin-topbar">
                    <div className="admin-topbar__left">
                        <button className="admin-topbar__hamburger" onClick={() => setSidebarOpen(true)}>
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <div className="admin-topbar__breadcrumb">
                            <span className="admin-topbar__breadcrumb-root">Admin</span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                            <span className="admin-topbar__breadcrumb-page">{currentPageLabel}</span>
                        </div>
                    </div>

                    <div className="admin-topbar__right">
                        {/* Search */}
                        <div className={`admin-search ${searchFocused ? 'admin-search--focused' : ''}`}>
                            <Search className="admin-search__icon w-3.5 h-3.5" />
                            <input
                                className="admin-search__input"
                                placeholder="Quick search…"
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                            <kbd className="admin-search__kbd">⌘K</kbd>
                        </div>

                        {/* Notifications */}
                        <div className="admin-notif" ref={notifRef}>
                            <button className="admin-notif__btn" onClick={handleNotifClick}>
                                <Bell className="w-4 h-4" />
                                {unreadCount > 0 && (
                                    <span className="admin-notif__badge">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifs && (
                                <div className="admin-notif__panel">
                                    <div className="admin-notif__header">
                                        <span>Notifications</span>
                                        {unreadCount > 0 && (
                                            <span className="admin-notif__unread-badge">{unreadCount} new</span>
                                        )}
                                    </div>
                                    <div className="admin-notif__list">
                                        {notifications.length === 0 ? (
                                            <div className="admin-notif__empty">
                                                <Zap className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                                <p>All caught up!</p>
                                            </div>
                                        ) : notifications.map(n => (
                                            <div key={n.id} className={`admin-notif__item ${!n.is_read ? 'admin-notif__item--unread' : ''}`}>
                                                <div className="admin-notif__item-dot" />
                                                <div>
                                                    <div className="admin-notif__item-title">{n.title}</div>
                                                    {n.message && <div className="admin-notif__item-msg">{n.message}</div>}
                                                    <div className="admin-notif__item-time">
                                                        {new Date(n.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="admin-avatar">A</div>
                    </div>
                </header>

                {/* Content */}
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
