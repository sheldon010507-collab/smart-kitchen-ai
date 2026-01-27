import React, { useMemo, useState } from 'react';
import { ChefHat, Building2, Users, ArrowRight, ArrowLeft, Mail, Lock, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  onLoginSuccess: (user: any, role: 'Manager' | 'Staff', businessId?: string) => void;
}

export default function SupabaseLogin({ onLoginSuccess }: Props) {
  const [step, setStep] = useState<'role' | 'login' | 'register'>('role');
  const [role, setRole] = useState<'Manager' | 'Staff' | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Manager 注册才需要店名
  const [storeName, setStoreName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const emailRedirectTo = useMemo(() => {
    // 关键：让确认邮件跳回你当前站点（localhost 或生产域名）
    if (typeof window === 'undefined') return undefined;
    return window.location.origin;
  }, []);

  const handleRoleSelect = (selectedRole: 'Manager' | 'Staff') => {
    setRole(selectedRole);
    setStep('login');
    setError(null);
  };

  const handleBack = () => {
    if (step === 'register') {
      setStep('login');
    } else {
      setStep('role');
      setRole(null);
    }
    setError(null);
  };

  // Staff：登录后取自己 active 的第一个 business（没有就 undefined）
  const getStaffActiveBusinessId = async (userId: string) => {
    const { data: members, error: memErr } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (memErr) throw memErr;
    return members?.[0]?.business_id as string | undefined;
  };

  // Manager：登录后取自己 active 的第一个 business（没有也允许进 master view）
  const getManagerActiveBusinessId = async (userId: string) => {
    const { data: members, error: memErr } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (memErr) throw memErr;
    return members?.[0]?.business_id as string | undefined;
  };

  const resendConfirmEmail = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });
      if (resendErr) {
        setError(resendErr.message);
      } else {
        setError('Confirmation email resent. Please check your inbox (and spam).');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to resend confirmation email');
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!role) {
        setError('Please select a role');
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes('invalid login')) {
          setError('Invalid email or password');
          return;
        }
        if (msg.includes('email not confirmed')) {
          setError('Email not confirmed. Please verify your email first, then sign in.');
          return;
        }
        setError(authError.message);
        return;
      }

      if (!data.user) {
        setError('Login failed');
        return;
      }

      // Force update role in metadata if it differs from selection
      // This ensures that if I log in as "Staff", I become "Staff" (and see StaffDashboard), 
      // even if I was previously a "Manager".
      if (data.user.user_metadata?.role !== role) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { role: role }
        });

        if (updateError) {
          console.error('Failed to update user role:', updateError);
          // Don't block login, but role might be wrong
        }
      }

      let businessId: string | undefined;

      if (role === 'Staff') {
        // ✅ 不再在登录时 join 店铺（邀请码在 App 里 Add Store 再输入）
        businessId = await getStaffActiveBusinessId(data.user.id);
      } else {
        // ✅ Manager 没 active business 也允许登录（App 里会显示 Master Dashboard 0 locations）
        businessId = await getManagerActiveBusinessId(data.user.id);
      }

      // NOTE: data.user object might still have old metadata if we didn't refetch,
      // but onAuthStateChange in AuthContext should catch the update event eventually.
      // We pass the *correct* role explicitly to validatation.
      onLoginSuccess(data.user, role, businessId);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!role) {
        setError('Please select a role');
        return;
      }

      // Manager 注册必须有店名
      if (role === 'Manager' && !storeName.trim()) {
        setError('Please enter your restaurant name');
        return;
      }

      // ✅ P3 Fix: Password strength validation
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError('Password must contain at least one uppercase letter');
        return;
      }
      if (!/[a-z]/.test(password)) {
        setError('Password must contain at least one lowercase letter');
        return;
      }
      if (!/[0-9]/.test(password)) {
        setError('Password must contain at least one number');
        return;
      }

      // ✅ 在 signUp 之前，先把店名存到 localStorage（用於郵件確認後自動建立）
      // 🆕 双重保护：同时存储到 localStorage 和 sessionStorage
      if (role === 'Manager' && storeName.trim() && typeof window !== 'undefined' && window.localStorage) {
        const trimmedName = storeName.trim();
        localStorage.setItem('pending_business_name', trimmedName);
        sessionStorage.setItem('pending_business_name', trimmedName);
        console.log(`[Registration] Saved pending business: "${trimmedName}"`);
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailRedirectTo || undefined,
          data: {
            full_name: name,
            role: role,
          },
        },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes('already registered')) {
          setError('This email is already registered. Please login instead.');
          return;
        }
        setError(authError.message);
        return;
      }

      if (!data.user) {
        setError('Registration failed');
        return;
      }

      // ✅ 檢查是否有 session（開啟郵箱驗證時通常沒有）
      if (!data.session) {
        // 沒有 session，需要郵件確認
        const businessMsg = role === 'Manager' && storeName.trim()
          ? ` Your restaurant "${storeName.trim()}" will be created automatically after login.`
          : '';
        setError(`Confirmation email sent. Please verify your email and log in again.${businessMsg}`);
        return;
      }

      // ✅ 有 session，可以直接創建 business
      // Manager：创建 business + membership active
      if (role === 'Manager') {
        const { data: newBusiness, error: bizError } = await supabase
          .from('businesses')
          .insert({
            owner_id: data.user.id,
            name: storeName.trim(),
          })
          .select()
          .single();

        if (bizError || !newBusiness) {
          // 插入失敗，不清 localStorage，讓登入後自動補建機制處理
          setError(bizError?.message || 'Failed to create restaurant');
          return;
        }

        // ✅ 插入成功，清掉 localStorage pending key
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('pending_business_name');
        }

        const { error: memErr } = await supabase.from('business_members').insert({
          business_id: newBusiness.id,
          user_id: data.user.id,
          role: 'owner',
          status: 'active',
        });

        if (memErr) {
          setError(memErr.message);
          return;
        }

        onLoginSuccess(data.user, 'Manager', newBusiness.id);
        return;
      }

      // ✅ Staff 注册成功后：不 join 店铺，等进 App 再 Add Store 输入邀请码
      onLoginSuccess(data.user, 'Staff', undefined);
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // 角色选择页面
  if (step === 'role') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl border border-[#e9e9e7] shadow-sm mb-6">
              <ChefHat className="w-12 h-12 text-[#37352f]" />
            </div>
            <h1 className="text-3xl font-bold text-[#37352f] tracking-tight mb-2">SmartKitchen</h1>
            <p className="text-[#787774] text-lg">AI Workspace</p>
          </div>

          <div className="space-y-4">
            <p className="text-center text-[#787774] text-sm font-semibold uppercase tracking-widest mb-6">Select Your Role</p>

            <button
              onClick={() => handleRoleSelect('Manager')}
              className="w-full bg-white p-6 rounded-xl border border-[#e9e9e7] hover:border-[#37352f] hover:shadow-md transition-all group text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-[#f7f6f3] rounded-xl group-hover:bg-[#e9e9e7] transition-colors border border-[#e9e9e7]">
                  <Building2 className="w-8 h-8 text-[#37352f]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#37352f] text-lg">Restaurant Manager</h3>
                  <p className="text-[#787774] text-sm mt-1">Manage stores, inventory, staff & menu</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#9b9a97] group-hover:text-[#37352f] transition-colors" />
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('Staff')}
              className="w-full bg-white p-6 rounded-xl border border-[#e9e9e7] hover:border-[#37352f] hover:shadow-md transition-all group text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-[#f7f6f3] rounded-xl group-hover:bg-[#e9e9e7] transition-colors border border-[#e9e9e7]">
                  <Users className="w-8 h-8 text-[#37352f]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#37352f] text-lg">Staff Member</h3>
                  <p className="text-[#787774] text-sm mt-1">Sign in with email & password</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#9b9a97] group-hover:text-[#37352f] transition-colors" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 登录/注册表单
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={handleBack}
          className="flex items-center text-secondary hover:text-primary mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4 border border-border bg-background">
              {role === 'Manager' ? <Building2 className="w-8 h-8 text-primary" /> : <Users className="w-8 h-8 text-primary" />}
            </div>
            <h2 className="text-2xl font-bold text-primary tracking-tight">
              {step === 'register' ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-secondary text-sm mt-2">{role === 'Manager' ? 'Restaurant Manager' : 'Staff Member'}</p>
          </div>

          <form onSubmit={step === 'register' ? handleRegister : handleLogin} className="space-y-5">
            {step === 'register' && (
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-border" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-border" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-border" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {role === 'Manager' && step === 'register' && (
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Restaurant Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-border" />
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    placeholder="Your restaurant name"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                <p className="text-red-600 text-sm">{error}</p>

                {(error.toLowerCase().includes('verify your email') ||
                  error.toLowerCase().includes('email not confirmed')) && (
                    <button
                      type="button"
                      onClick={resendConfirmEmail}
                      disabled={resending}
                      className="w-full py-2.5 bg-white border border-border rounded-lg text-sm font-semibold hover:bg-background disabled:opacity-50"
                    >
                      {resending ? 'Resending...' : 'Resend confirmation email'}
                    </button>
                  )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white rounded-lg font-semibold hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Processing...' : step === 'register' ? 'Create Account' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-secondary text-sm">
              {step === 'register' ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setStep(step === 'register' ? 'login' : 'register')}
                className="ml-2 text-accent font-semibold hover:underline"
              >
                {step === 'register' ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
