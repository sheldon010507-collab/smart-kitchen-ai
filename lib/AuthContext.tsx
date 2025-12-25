import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 確保 pending business 被創建（如果 localStorage 中有 pending_business_name）
  async function ensurePendingBusiness(userId: string) {
    try {
      const pendingName = localStorage.getItem('pending_business_name');
      if (!pendingName) {
        return;
      }

      // 檢查是否已存在 business
      const { data: existingBusiness, error: selectError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, 這是正常的
        console.error('Error checking existing business:', selectError);
        return;
      }

      if (existingBusiness) {
        // 已存在 business，清掉 localStorage
        localStorage.removeItem('pending_business_name');
        return;
      }

      // 不存在，新增一條記錄
      const { error: insertError } = await supabase
        .from('businesses')
        .insert({ name: pendingName, owner_id: userId });

      if (insertError) {
        console.error('Error inserting pending business:', insertError);
        return;
      }

      // 成功後清掉 localStorage
      localStorage.removeItem('pending_business_name');
    } catch (error) {
      console.error('Error in ensurePendingBusiness:', error);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // 如果有 user，嘗試創建 pending business
      if (session?.user?.id) {
        ensurePendingBusiness(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        // 如果有 user，嘗試創建 pending business
        if (session?.user?.id) {
          ensurePendingBusiness(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}