
import React, { useState } from 'react';
import { User } from '../types';
import { ChefHat, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  onLogin: (user: User, businessId?: string, businessName?: string) => void;
  onRequestJoin: (user: User, joinCode: string) => void;
}

const Login: React.FC<Props> = ({ onLogin, onRequestJoin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Default to Manager for login convenience, but allow switching
  const [role, setRole] = useState<'Manager' | 'Staff'>('Manager');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [otp, setOtp] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });

      const data = await res.json();

      if (res.ok) {
        setStep('otp');
      } else {
        alert(data.error || "Failed to send verification code");
      }
    } catch (error) {
      console.error(error);
      alert("Network error. Ensure you are connected to the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      alert("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, code: otp })
      });

      const data = await res.json();

      if (res.ok) {
        const mockUser: User = {
          id: email, 
          name: name || email.split('@')[0],
          email,
          role: role, 
        };

        if (mode === 'register') {
          if (role === 'Manager') {
            onLogin(mockUser, undefined, storeName);
          } else {
            onRequestJoin(mockUser, storeCode);
            alert("Request sent! Waiting for manager approval.");
            setStep('credentials');
            setMode('login');
          }
        } else {
          onLogin(mockUser);
        }
      } else {
        alert(data.error || "Invalid verification code");
      }
    } catch (error) {
      console.error(error);
      alert("Verification request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans text-primary">
      <div className="bg-white rounded-2xl shadow-sm border border-border max-w-sm w-full overflow-hidden p-10">
        
        {/* Header */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4 bg-background border border-border">
               <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2 tracking-tight text-primary">Smart Kitchen AI</h1>
            <p className="text-secondary text-sm">
              {step === 'otp' ? 'Check your email for the code' : (mode === 'login' ? 'Log in to your workspace' : 'Create your workspace')}
            </p>
        </div>

        {/* Form */}
        <form onSubmit={step === 'credentials' ? handleSendOtp : handleVerifyAndSubmit} className="space-y-5">
          
          {step === 'credentials' ? (
            <>
              {/* Role Switcher - Visible in both modes */}
              <div className="flex space-x-3 mb-2">
                <button
                  type="button"
                  onClick={() => setRole('Manager')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg border transition-all ${
                    role === 'Manager' ? 'border-accent bg-accent text-white shadow-sm' : 'border-border text-secondary hover:bg-gray-50'
                  }`}
                >
                  Manager
                </button>
                <button
                  type="button"
                  onClick={() => setRole('Staff')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg border transition-all ${
                    role === 'Staff' ? 'border-accent bg-accent text-white shadow-sm' : 'border-border text-secondary hover:bg-gray-50'
                  }`}
                >
                  Staff
                </button>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-base bg-background"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-base bg-background"
                  placeholder="name@work.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-base bg-background"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {mode === 'register' && (
                <div className="pt-2">
                  {role === 'Manager' ? (
                     <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Workspace Name</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-base bg-background"
                          placeholder="My Restaurant"
                          value={storeName}
                          onChange={e => setStoreName(e.target.value)}
                        />
                     </div>
                  ) : (
                     <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Join Code</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-base bg-background font-mono"
                          placeholder="CODE1234"
                          value={storeCode}
                          onChange={e => setStoreCode(e.target.value)}
                        />
                     </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-6">
              <input 
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-lg border border-border focus:outline-none focus:border-accent bg-background"
                placeholder="000000"
                autoFocus
              />
              <p className="text-sm text-secondary">Code sent to <span className="text-primary font-medium">{email}</span></p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-accent text-white rounded-lg text-sm font-bold tracking-wide hover:bg-accentHover transition-colors flex items-center justify-center mt-6 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {step === 'credentials' ? 'Continue' : 'Verify & Enter'}
                {step === 'credentials' && <ArrowRight className="w-4 h-4 ml-2" />}
              </>
            )}
          </button>
          
          {step === 'credentials' && (
            <div className="text-center mt-6">
                <button 
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-sm font-medium text-secondary hover:text-primary transition-colors"
                >
                    {mode === 'login' ? "Create an account" : "Log in to existing account"}
                </button>
            </div>
          )}
          
          {step === 'otp' && (
            <button 
              type="button" 
              onClick={() => setStep('credentials')}
              className="w-full text-center text-sm font-medium text-secondary hover:text-primary mt-4"
            >
              Back to login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
