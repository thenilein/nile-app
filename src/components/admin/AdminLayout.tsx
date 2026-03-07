import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, UtensilsCrossed, Tag, ShoppingBag, Users,
    Ticket, BarChart3, Settings, ScrollText, Bell, LogOut,
    Menu as MenuIcon, X, Sun, Moon, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';

const NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Menu Items', icon: UtensilsCrossed, path: '/admin/menu' },
    { label: 'Categories', icon: Tag, path: '/admin/categories' },
    { label: 'Orders', icon: ShoppingBag, path: '/admin/orders' },
    { label: 'Customers', icon: Users, path: '/admin/users' },
    { label: 'Promotions', icon: Ticket, path: '/admin/promotions' },
    { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
    { label: 'Audit Logs', icon: ScrollText, path: '/admin/logs' },
];

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAllRead, refreshNotifications } = useAdmin();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const [dark, setDark] = useState(() => localStorage.getItem('admin_dark') === 'true');

    useEffect(() => {
        document.documentElement.classList.toggle('admin-dark', dark);
        localStorage.setItem('admin_dark', String(dark));
    }, [dark]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const handleNotifClick = async () => {
        setShowNotifs(v => !v);
        if (!showNotifs) {
            await refreshNotifications();
            await markAllRead();
        }
    };

    const Sidebar = ({ mobile = false }) => (
        <aside className={`
            ${mobile ? 'flex' : 'hidden md:flex'}
            flex-col w-64 bg-gray-900 text-white min-h-screen flex-shrink-0
            ${mobile ? 'fixed inset-y-0 left-0 z-50 shadow-2xl' : ''}
        `}>
            {/* Brand */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
                <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center font-bold text-lg shadow">N</div>
                <div>
                    <div className="font-bold text-sm tracking-wide">nile admin</div>
                    <div className="text-xs text-gray-400">Ice Creams Panel</div>
                </div>
                {mobile && (
                    <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map(({ label, icon: Icon, path }) => (
                    <NavLink
                        key={path}
                        to={path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${isActive
                                ? 'bg-green-600 text-white shadow'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`
                        }
                    >
                        <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                        <span className="flex-1">{label}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-gray-700 space-y-2">
                <button
                    onClick={() => setDark(d => !d)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                >
                    {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {dark ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        </aside>
    );

    return (
        <div className={`flex min-h-screen ${dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
            {/* Desktop sidebar */}
            <Sidebar />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
                    <Sidebar mobile />
                </>
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top bar */}
                <header className={`flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} shadow-sm z-10`}>
                    <button
                        className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <MenuIcon className="w-5 h-5" />
                    </button>
                    <div className="hidden md:block" />

                    <div className="flex items-center gap-3">
                        {/* Notification bell */}
                        <div className="relative">
                            <button
                                onClick={handleNotifClick}
                                className={`relative p-2 rounded-lg transition-colors ${dark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifs && (
                                <div className={`absolute right-0 top-12 w-80 rounded-xl shadow-2xl border z-50 overflow-hidden ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className={`px-4 py-3 border-b font-semibold text-sm ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                                        Notifications
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-sm text-gray-500">No notifications</div>
                                        ) : notifications.map(n => (
                                            <div key={n.id} className={`px-4 py-3 border-b transition-colors ${dark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-50 hover:bg-gray-50'}`}>
                                                <div className="font-medium text-sm">{n.title}</div>
                                                {n.message && <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>}
                                                <div className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
