import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const GUEST_KEY = "guest_session";

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
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_KEY).then((v) => setIsGuest(v === "true"));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setIsGuest(false);
        AsyncStorage.removeItem(GUEST_KEY);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const continueAsGuest = () => {
    setIsGuest(true);
    AsyncStorage.setItem(GUEST_KEY, "true");
  };

  const signOut = async () => {
    setIsLoading(true);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
