import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { isUserAdmin } from '../lib/adminRole.ts';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    is_read: boolean;
    related_id: string | null;
    created_at: string;
}

interface AdminContextType {
    isAdmin: boolean;
    isCheckingAdmin: boolean;
    notifications: Notification[];
    unreadCount: number;
    markAllRead: () => Promise<void>;
    logAction: (action: string, tableName: string, recordId?: string, description?: string, oldData?: any, newData?: any) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const check = async () => {
            if (!user) { setIsAdmin(false); setIsCheckingAdmin(false); return; }
            setIsAdmin(await isUserAdmin(user.id));
            setIsCheckingAdmin(false);
        };
        check();
    }, [user]);

    const refreshNotifications = useCallback(async () => {
        if (!isAdmin) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30);
        setNotifications(data || []);
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin) refreshNotifications();
    }, [isAdmin, refreshNotifications]);

    const markAllRead = async () => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const logAction = useCallback(async (
        action: string,
        tableName: string,
        recordId?: string,
        description?: string,
        oldData?: any,
        newData?: any
    ) => {
        if (!user) return;
        await supabase.from('admin_logs').insert({
            admin_id: user.id,
            action,
            table_name: tableName,
            record_id: recordId,
            description,
            old_data: oldData ? JSON.stringify(oldData) : null,
            new_data: newData ? JSON.stringify(newData) : null,
        });
    }, [user]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <AdminContext.Provider value={{
            isAdmin, isCheckingAdmin, notifications, unreadCount,
            markAllRead, logAction, refreshNotifications
        }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
    return ctx;
};
