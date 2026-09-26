import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
}

// Strict email validation supporting valid domains (e.g., gmail.com, outlook.com, company.com, stocksense.internal)
const validateEmail = (val: string): { isValid: boolean; error?: string } => {
  const trimmed = val.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Work Identity Email is required.' };
  }

  // Standard strict regex for valid email format: username@domain.extension
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    if (!trimmed.includes('@')) {
      return { isValid: false, error: 'Email must contain an "@" symbol (e.g. user@gmail.com).' };
    }
    const [localPart, domainPart] = trimmed.split('@');
    if (!localPart || localPart.trim() === '') {
      return { isValid: false, error: 'Username before "@" cannot be empty.' };
    }
    if (!domainPart || domainPart.trim() === '') {
      return { isValid: false, error: 'Domain is missing after "@". Use @gmail.com, @yahoo.com, @company.com, etc.' };
    }
    if (!domainPart.includes('.')) {
      return { isValid: false, error: 'Domain must include a dot and extension like .com, .org, or .internal.' };
    }
    const tld = domainPart.split('.').pop();
    if (!tld || tld.length < 2) {
      return { isValid: false, error: 'Please enter a valid domain extension (e.g. .com, .net, .internal).' };
    }
    return { isValid: false, error: 'Please enter a valid email format (e.g. user@gmail.com or alex.vance@stocksense.internal).' };
  }
  return { isValid: true };
};

// Password Validation: 8+ chars, first letter capital (A-Z), at least one special character
const validatePassword = (val: string): {
  isValid: boolean;
  hasLength: boolean;
  hasFirstCapital: boolean;
  hasSpecialChar: boolean;
  error?: string;
} => {
  const hasLength = val.length >= 8;
  const hasFirstCapital = /^[A-Z]/.test(val);
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;
  const hasSpecialChar = specialCharRegex.test(val);

  const isValid = hasLength && hasFirstCapital && hasSpecialChar;

  let error: string | undefined;
  if (!val) {
    error = 'Master password is required.';
  } else if (!hasFirstCapital) {
    error = 'The first character must be a capital letter (A-Z).';
  } else if (!hasLength) {
    error = 'Password must be at least 8 characters long.';
  } else if (!hasSpecialChar) {
    error = 'Password must include at least one special character (e.g. !@#$%^&*).';
  }

  return {
    isValid,
    hasLength,
    hasFirstCapital,
    hasSpecialChar,
    error,
  };
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Role state
  const [role, setRole] = useState<'Inventory Manager' | 'Warehouse Staff'>('Inventory Manager');
  const [email, setEmail] = useState('manager@stocksense.dev');
  const [password, setPassword] = useState('Manager@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Form Validation Errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Live password validation status
  const pwdStatus = validatePassword(password);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // OTP Modal state
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['4', '8', '2', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(42);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Toast state
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    title: '',
    message: '',
    icon: 'check_circle',
  });
  const toastTimeoutRef = useRef<any>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle Toast helper
  const showToast = (title: string, message: string, icon = 'check_circle') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ visible: true, title, message, icon });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  };

  // Switch role handler
  const handleSelectRole = (newRole: 'Inventory Manager' | 'Warehouse Staff') => {
    setRole(newRole);
    setEmailError(null);
    setPasswordError(null);
    if (newRole === 'Warehouse Staff') {
      setEmail('staff@stocksense.dev');
      setPassword('Staff@123');
      showToast('Staff Persona Loaded', 'Floor picking and receipting scopes mounted.', 'badge');
    } else {
      setEmail('manager@stocksense.dev');
      setPassword('Manager@123');
      showToast('Manager Persona Loaded', 'Audit and configuration capabilities active.', 'admin_panel_settings');
    }
  };

  // OTP countdown timer
  useEffect(() => {
    let timer: any;
    if (isOtpOpen && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpOpen, otpCountdown]);

  // Handle Form Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Strict Email check
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      setEmailError(emailRes.error || 'Please enter a valid email address.');
      showToast('Invalid Email Address', emailRes.error || 'A valid email domain is required (e.g. @gmail.com).', 'error');
      return;
    }
    setEmailError(null);

    // Strict Password check: 8+ chars, first letter capital, special char
    const pwdRes = validatePassword(password);
    if (!pwdRes.isValid) {
      setPasswordError(pwdRes.error || 'Password does not meet required security criteria.');
      showToast('Password Criteria Error', pwdRes.error || 'Password must meet all 3 criteria.', 'error');
      return;
    }
    setPasswordError(null);

    setIsSubmitting(true);

    try {
      await login(email, password, role);
      setIsSuccess(true);
      showToast('Ledger Session Mounted', `Logged in as ${email}`, 'lock_open');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (err: any) {
      setIsSubmitting(false);
      showToast('Login Failed', err.message || 'Invalid credentials or account locked.', 'error');
    }
  };

  // Handle OTP Submission
  const handleOtpSubmit = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      showToast('Incomplete Token', 'Please enter all 6 digits of your passkey.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: code, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'OTP reset failed');
      }
      setIsOtpOpen(false);
      showToast('Password Reset Complete', 'You can now sign in with your updated credentials.', 'verified');
    } catch (err: any) {
      showToast('OTP Verification Failed', err.message, 'error');
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setOtpCountdown(60);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.devCode) {
        showToast('Demo OTP Code', `Code: ${data.devCode}`, 'key');
        setOtpDigits(data.devCode.split(''));
      } else {
        showToast('Dispatching Token', 'A fresh OTP token was delivered.', 'mark_email_read');
      }
    } catch {
      showToast('Dispatching Token', 'A fresh OTP token was delivered.', 'mark_email_read');
    }
  };

  const handleOpenOtpModal = async () => {
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      setEmailError(emailRes.error || 'Please enter a valid email address first.');
      showToast('Valid Email Required', 'Please enter a valid email address before requesting an OTP.', 'error');
      return;
    }
    setEmailError(null);
    setIsOtpOpen(true);
    setOtpCountdown(60);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.devCode) {
        showToast('Demo OTP Code', `Code: ${data.devCode} (valid ${data.ttlMinutes}m)`, 'key');
        setOtpDigits(data.devCode.split(''));
      } else {
        showToast('OTP Dispatched', data.message || 'Verification code sent.', 'mail');
      }
    } catch {
      showToast('OTP Dispatched', 'Reset code dispatched to authorized identity.', 'mail');
    }
  };

  const handleSsoClick = () => {
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      setEmailError(emailRes.error || 'Please enter a valid email address.');
      showToast('Valid Email Required', 'Please enter a valid email domain for SAML SSO.', 'error');
      return;
    }
    setEmailError(null);
    showToast('SSO Redirect', 'Connecting to Okta SAML 2.0 Identity Provider...', 'cloud_sync');
    setTimeout(() => {
      login(email, role);
      navigate('/', { replace: true });
    }, 1200);
  };

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen flex flex-col justify-center items-center">
      <main className="w-full flex flex-col flex-1">
        <div className="flex flex-col w-full">
          <div className="w-full min-h-[920px] flex flex-col lg:flex-row bg-surface">
            {/* LEFT PANEL: Brand Context & Industrial Telemetry */}
            <div className="relative hidden lg:flex lg:w-1/2 bg-inverse-surface text-inverse-on-surface p-10 xl:p-14 flex-col justify-between overflow-hidden shadow-2xl">
              {/* Ambient Blueprint Glow & Technical Geometry */}
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

              {/* Top Brand Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0">
                    <img
                      alt="StockSense Identity"
                      className="w-full h-full object-contain"
                      src="/brand/icon.png"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-headline-md tracking-tight text-white font-bold">
                      StockSense
                    </span>
                    <span className="font-label-sm text-[11px] text-slate-300 uppercase tracking-wider">
                      Modular IMS · Enterprise Ledger
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-code-md text-code-md text-white font-semibold">ERP v2.14</span>
                </div>
              </div>

              {/* Core Value Proposition */}
              <div className="relative z-10 my-auto py-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 font-label-sm text-label-sm mb-4">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  <span>MISSION-CRITICAL INFRASTRUCTURE</span>
                </div>
                <h1 className="font-headline-lg text-[28px] leading-tight font-bold text-white max-w-lg tracking-tight">
                  Precision Stock Ledger & Multi-Warehouse Operations.
                </h1>
                <p className="font-body-md text-body-md text-slate-300 mt-3 max-w-md leading-relaxed">
                  Real-time double-entry inventory management with immutable move logs, automated reorder rules, and complete operational auditability.
                </p>

                {/* Technical Highlights Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-headline-md text-headline-md text-white font-bold">99.9%</span>
                      <span className="material-symbols-outlined text-emerald-400 text-base">trending_up</span>
                    </div>
                    <div className="font-label-sm text-label-sm text-slate-400">Physical Accuracy</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-headline-md text-headline-md text-white font-bold">ACID</span>
                      <span className="material-symbols-outlined text-indigo-300 text-base">lock_clock</span>
                    </div>
                    <div className="font-label-sm text-label-sm text-slate-400">Atomic Move Engine</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-headline-md text-headline-md text-white font-bold">&lt;12ms</span>
                      <span className="material-symbols-outlined text-blue-300 text-base">barcode_scanner</span>
                    </div>
                    <div className="font-label-sm text-label-sm text-slate-400">Sub-sec RFID Sync</div>
                  </div>
                </div>

                {/* Warehouse Live Telemetry Card */}
                <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 shadow-inner backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="font-label-sm text-label-sm text-white font-medium">DC-East Central Gateway</span>
                    </div>
                    <span className="font-code-md text-code-md text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/20">
                      FIPS-140-3
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-black/30 rounded p-2 border border-white/5">
                      <div className="font-label-sm text-label-sm text-slate-400">Active Nodes</div>
                      <div className="font-code-md text-code-md text-white mt-0.5 font-semibold">4 Online</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 border border-white/5">
                      <div className="font-label-sm text-label-sm text-slate-400">Protocol</div>
                      <div className="font-code-md text-code-md text-white mt-0.5 font-semibold">TLS 1.3 Strict</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 border border-white/5">
                      <div className="font-label-sm text-label-sm text-slate-400">Throughput</div>
                      <div className="font-code-md text-code-md text-emerald-300 mt-0.5 font-semibold">1,420 pkts/hr</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Authentication Form & Dynamic State Container */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-surface-container-lowest">
              <div className="w-full max-w-md mx-auto flex flex-col justify-center">
                {/* Mobile Brand Identity Header */}
                <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <img
                      alt="StockSense Brand Logo"
                      className="w-9 h-9 rounded-lg object-contain bg-surface-container-low p-1 shadow-xs"
                      src="/brand/icon.png"
                    />
                    <div className="flex flex-col">
                      <span className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">
                        StockSense
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Modular Inventory System
                      </span>
                    </div>
                  </div>
                  <span className="font-code-md text-code-md bg-secondary-container text-on-secondary-fixed px-2.5 py-0.5 rounded-full font-medium">
                    v2.14 ERP
                  </span>
                </div>

                {/* Form Top Brand Display (Desktop & Mobile) */}
                <div className="mb-6 flex flex-col items-start">
                  <div className="hidden lg:flex items-center gap-2 mb-4">
                    <img
                      alt="StockSense"
                      className="h-10 w-auto object-contain"
                      src="/brand/logo.png"
                    />
                  </div>
                  <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                    Welcome back
                  </h2>
                  <p className="font-body-md text-body-md text-secondary mt-1">
                    Enter authorized credentials to mount warehouse partition.
                  </p>
                </div>

                {/* Role Segmented Toggle Control */}
                <div className="bg-surface-container-low p-1 rounded-xl flex items-center mb-6 shadow-inner" id="roleSelector">
                  <button
                    className={`flex-1 py-2 text-center rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 ${
                      role === 'Warehouse Staff'
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                    onClick={() => handleSelectRole('Warehouse Staff')}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    <span>Warehouse Staff</span>
                  </button>
                  <button
                    className={`flex-1 py-2 text-center rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 ${
                      role === 'Inventory Manager'
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                    onClick={() => handleSelectRole('Inventory Manager')}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    <span>Inventory Manager</span>
                  </button>
                </div>

                {/* Credentials Form */}
                <form noValidate className="flex flex-col gap-4.5" onSubmit={handleLoginSubmit}>
                  {/* Email / Identity Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="workEmail">
                      <span>Work Identity Email</span>
                      <span
                        className={`font-code-md text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          role === 'Inventory Manager'
                            ? 'text-primary bg-primary-fixed'
                            : 'text-secondary bg-surface-container-high'
                        }`}
                      >
                        {role === 'Inventory Manager' ? 'Manager Access' : 'Floor Staff Access'}
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none">
                        mail
                      </span>
                      <input
                        className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all placeholder:text-outline border ${
                          emailError
                            ? 'border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-400 focus:bg-white'
                            : 'border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary'
                        }`}
                        id="workEmail"
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) {
                            const res = validateEmail(e.target.value);
                            if (res.isValid) setEmailError(null);
                          }
                        }}
                        onBlur={() => {
                          if (email) {
                            const res = validateEmail(email);
                            if (!res.isValid) setEmailError(res.error || 'Invalid email');
                            else setEmailError(null);
                          }
                        }}
                        placeholder="e.g. alex.vance@stocksense.internal or name@gmail.com"
                        type="email"
                        value={email}
                      />
                    </div>
                    {emailError && (
                      <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-0.5 animate-in fade-in duration-150">
                        <span className="material-symbols-outlined text-[15px]">error</span>
                        <span>{emailError}</span>
                      </div>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-label-md text-on-surface" htmlFor="userPassword">
                        Master Password
                      </label>
                      <button
                        className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors focus:outline-none flex items-center gap-1 cursor-pointer"
                        onClick={handleOpenOtpModal}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">key</span>
                        <span>Forgot password? (Use OTP)</span>
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none">
                        lock
                      </span>
                      <input
                        className={`w-full pl-10 pr-10 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all tracking-wider border ${
                          passwordError
                            ? 'border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-400 focus:bg-white'
                            : 'border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary'
                        }`}
                        id="userPassword"
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) {
                            const res = validatePassword(e.target.value);
                            if (res.isValid) setPasswordError(null);
                          }
                        }}
                        onBlur={() => {
                          if (password) {
                            const res = validatePassword(password);
                            if (!res.isValid) setPasswordError(res.error || 'Invalid password');
                            else setPasswordError(null);
                          }
                        }}
                        placeholder="••••••••••••"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                      />
                      <button
                        aria-label="Toggle password visibility"
                        className="absolute right-3 text-secondary hover:text-on-surface transition-colors p-1 flex items-center justify-center focus:outline-none cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* Live Password Security Criteria Checklist */}
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all ${
                          pwdStatus.hasLength
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {pwdStatus.hasLength ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>8+ characters</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all ${
                          pwdStatus.hasFirstCapital
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {pwdStatus.hasFirstCapital ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>First letter capital (A-Z)</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all ${
                          pwdStatus.hasSpecialChar
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {pwdStatus.hasSpecialChar ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Special char (!@#$...)</span>
                      </span>
                    </div>

                    {passwordError && (
                      <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-0.5 animate-in fade-in duration-150">
                        <span className="material-symbols-outlined text-[15px]">error</span>
                        <span>{passwordError}</span>
                      </div>
                    )}
                  </div>

                  {/* Device Session Persistence */}
                  <div className="flex items-center justify-between pt-1 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        checked={rememberDevice}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                        id="rememberDevice"
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm text-secondary">
                        Remember hardware ID for 14 days
                      </span>
                    </label>
                    <div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">desktop_windows</span>
                      <span>WS-8842</span>
                    </div>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    className={`w-full py-3 px-4 rounded-lg font-headline-sm text-headline-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-md group cursor-pointer ${
                      isSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary text-on-primary hover:bg-primary-container'
                    }`}
                    disabled={isSubmitting}
                    type="submit"
                  >
                    <span>
                      {isSuccess
                        ? 'Authenticated — Mounting ERP'
                        : isSubmitting
                        ? 'Authenticating Partition...'
                        : 'Sign In to Workspace'}
                    </span>
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform ${
                        isSubmitting && !isSuccess
                          ? 'animate-spin'
                          : 'group-hover:translate-x-1'
                      }`}
                    >
                      {isSuccess ? 'task_alt' : isSubmitting ? 'sync' : 'arrow_forward'}
                    </span>
                  </button>
                </form>

                {/* SSO Section */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-surface-container-high" />
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                    or SSO Gateway
                  </span>
                  <div className="h-[1px] flex-1 bg-surface-container-high" />
                </div>

                <button
                  className="w-full py-2.5 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-2.5 transition-colors shadow-sm cursor-pointer"
                  onClick={handleSsoClick}
                  type="button"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">shield_person</span>
                  <span>Enterprise SAML 2.0 / Okta Authenticator</span>
                </button>

                {/* Compliance & Security Assurance Footer */}
                <div className="mt-8 pt-4 flex flex-col items-center gap-1 text-center">
                  <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">verified</span>
                    <span>Protected by Multi-Factor Ledger Authentication</span>
                  </div>
                  <span className="font-code-md text-code-md text-outline">
                    ISO/IEC 27001 Certified · SOC 2 Type II Audited
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE OTP RESET MODAL */}
          {isOtpOpen && (
            <div
              aria-labelledby="otpModalTitle"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-sm animate-in fade-in duration-200"
              role="dialog"
            >
              <div
                className="bg-surface-container-lowest rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-100"
                id="otpModalCard"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[24px]">phonelink_ring</span>
                    </div>
                    <div>
                      <h3 className="font-headline-md text-headline-md font-bold text-on-surface" id="otpModalTitle">
                        Reset via OTP Token
                      </h3>
                      <span className="font-label-sm text-label-sm text-secondary">
                        Step 2: Emergency Passkey Verification
                      </span>
                    </div>
                  </div>
                  <button
                    aria-label="Close Modal"
                    className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => setIsOtpOpen(false)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Instructions & Context */}
                <p className="font-body-md text-body-md text-secondary leading-relaxed mb-6">
                  A 6-digit cryptographic verification code has been dispatched to the authorized device assigned to{' '}
                  <strong className="text-on-surface font-semibold">{email}</strong>.
                </p>

                {/* 6-Digit OTP Field Array */}
                <div className="flex items-center justify-between gap-2 mb-6">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      className="w-12 h-13 text-center font-code-md text-[20px] font-bold bg-surface-container-low text-primary rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all border border-transparent focus:border-primary"
                      inputMode="numeric"
                      maxLength={1}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      type="text"
                      value={digit}
                    />
                  ))}
                </div>

                {/* Resend Status & Timer */}
                <div className="flex items-center justify-between font-label-md text-label-md mb-6">
                  <span className="text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>
                      Expires in{' '}
                      <strong className="text-on-surface">
                        00:{otpCountdown < 10 ? `0${otpCountdown}` : otpCountdown}
                      </strong>
                    </span>
                  </span>
                  <button
                    className={`text-primary hover:text-primary-container font-semibold transition-colors ${
                      otpCountdown > 0 ? 'opacity-50 cursor-not-allowed' : 'underline cursor-pointer'
                    }`}
                    disabled={otpCountdown > 0}
                    onClick={handleResendOtp}
                    type="button"
                  >
                    Resend code
                  </button>
                </div>

                {/* Actions Stack */}
                <div className="flex flex-col gap-2.5">
                  <button
                    className="w-full py-3 bg-primary text-on-primary rounded-lg font-headline-sm text-headline-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md cursor-pointer"
                    onClick={handleOtpSubmit}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Verify Token & Continue</span>
                  </button>
                  <button
                    className="w-full py-2.5 text-secondary hover:text-on-surface rounded-lg font-label-md text-label-md transition-colors cursor-pointer"
                    onClick={() => setIsOtpOpen(false)}
                    type="button"
                  >
                    Return to Identity Authentication
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Micro Notification Toast Feedback */}
          <div
            className={`fixed bottom-6 right-6 z-50 bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-transform duration-300 transform pointer-events-none ${
              toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
            }`}
          >
            <span className="material-symbols-outlined text-emerald-400">{toast.icon}</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-surface-container-lowest font-semibold">
                {toast.title}
              </span>
              <span className="font-body-sm text-body-sm text-outline-variant">{toast.message}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
