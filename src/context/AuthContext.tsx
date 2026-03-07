import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isGuest: boolean;
    continueAsGuest: () => void;
    signOut: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState<boolean>(() => {
        return localStorage.getItem('guest_session') === 'true';
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Init session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                // If a real user logs in, remove guest status
                if (session?.user) {
                    setIsGuest(false);
                    localStorage.removeItem('guest_session');
                }
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const continueAsGuest = () => {
        setIsGuest(true);
        localStorage.setItem('guest_session', 'true');
    };

    const signOut = async () => {
        setIsLoading(true);
        setIsGuest(false);
        localStorage.removeItem('guest_session');
        await supabase.auth.signOut();
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{ session, user, isGuest, continueAsGuest, signOut, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
