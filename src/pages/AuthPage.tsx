import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';


type AuthTab = 'signin' | 'signup';
type Role = 'admin' | 'patient';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timeoutsRef.current[id];
    if (handle) {
      window.clearTimeout(handle);
      delete timeoutsRef.current[id];
    }
  }, []);

  const push = useCallback((type: ToastType, message: string, ttlMs = 3000) => {
    const id = generateId();
    const toast: Toast = { id, type, message };
    setToasts((prev) => [...prev, toast]);
    const handle = window.setTimeout(() => remove(id), ttlMs);
    timeoutsRef.current[id] = handle;
  }, [remove]);

  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach((h) => window.clearTimeout(h));
      timeoutsRef.current = {};
    };
  }, []);

  return { toasts, push, remove } as const;
}

function Toasts({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="fixed z-50 bottom-4 right-4 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            'min-w-[260px] max-w-sm rounded-lg border px-4 py-3 shadow-lg transition ' +
            (t.type === 'success'
              ? 'bg-white border-green-200 text-green-800'
              : t.type === 'error'
              ? 'bg-white border-red-200 text-red-800'
              : 'bg-white border-slate-200 text-slate-800')
          }
        >
          <div className="flex items-start gap-3">
            <span className={
              'mt-0.5 inline-flex h-2.5 w-2.5 flex-none rounded-full ' +
              (t.type === 'success' ? 'bg-green-500' : t.type === 'error' ? 'bg-red-500' : 'bg-slate-400')
            }/>
            <p className="text-sm leading-5">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onClose(t.id)}
              className="ml-auto text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 rounded"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

async function signUpUser(_email: string, _password: string, _displayName?: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
}

export default function AuthPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<Role>('admin');

  const { toasts, push, remove } = useToasts();
  const { loginWithGoogle, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const urlRole = location.search.split('?role=')[1];
    if (urlRole === 'patient' || urlRole === 'admin') {
      setRole(urlRole as Role);
    }
  }, [location.search]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) e.email = 'Email is required';
    else if (!emailPattern.test(email.trim())) e.email = 'Enter a valid email address';

    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';

    if (activeTab === 'signup') {
      if (!confirmPassword) e.confirmPassword = 'Confirm your password';
      else if (password && confirmPassword !== password) e.confirmPassword = 'Passwords do not match';
    }
    return e;
  }, [email, password, confirmPassword, activeTab]);

  const hasErrors = Object.keys(errors).length > 0;

  const redirectPatientAfterLogin = useCallback(async () => {
    // Decide where to send the patient: dashboard if profile exists, else registration
    try {
      const currentUser = (await import('firebase/auth')).getAuth().currentUser;
      const uid = currentUser?.uid;
      if (!uid) {
        navigate('/patient/register');
        return;
      }
      const snap = await getDoc(doc(db, 'patientProfiles', uid));
      if (snap.exists()) navigate('/patient'); else navigate('/patient/register');
    } catch {
      navigate('/patient/register');
    }
  }, [navigate]);

  const handleSubmit = useCallback(async () => {
    if (hasErrors) {
      push('error', 'Please fix the form errors and try again.');
      return;
    }
    setIsLoading(true);
    try {
      if (activeTab === 'signin') {
        await login(email.trim(), password);
        push('success', 'Signed in successfully.');
        if (role === 'admin') navigate('/'); else await redirectPatientAfterLogin();
      } else {
        await signUpUser(email.trim(), password, displayName.trim() || undefined);
        push('success', 'Account created successfully.');
        if (role === 'admin') navigate('/'); else await redirectPatientAfterLogin();
      }
    } catch (err) {
      push('error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [hasErrors, activeTab, email, password, displayName, role, navigate, login, push, redirectPatientAfterLogin]);

  const onGoogleContinue = useCallback(async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      push('success', 'Signed in with Google.');
      if (role === 'admin') navigate('/'); else await redirectPatientAfterLogin();
    } catch (err) {
      push('error', 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  }, [loginWithGoogle, navigate, role, push, redirectPatientAfterLogin]);

  const title = activeTab === 'signin' ? 'Welcome back' : 'Create your account';
  const subtitle = activeTab === 'signin' ? 'Sign in to continue' : 'Sign up to get started';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-slate-900 text-white inline-flex items-center justify-center font-semibold">M</div>
                <h1 className="text-lg font-semibold text-slate-900">MindCare Hub</h1>
              </div>
              <div>
                <label className="sr-only" htmlFor="role">Role</label>
                <div className="inline-flex rounded-lg border border-slate-300 p-1" role="group" aria-label="Select role">
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`px-3 py-1.5 text-sm rounded-md ${role === 'admin' ? 'bg-[#0066CC] text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                    aria-pressed={role === 'admin'}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('patient')}
                    className={`px-3 py-1.5 text-sm rounded-md ${role === 'patient' ? 'bg-[#0066CC] text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                    aria-pressed={role === 'patient'}
                  >
                    Patient
                  </button>
                </div>
              </div>
            </div>
            <div className="flex rounded-lg p-1 bg-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className={
                  'w-1/2 py-2 rounded-md text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ' +
                  (activeTab === 'signin' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900')
                }
                role="tab"
                aria-selected={activeTab === 'signin'}
                aria-controls="signin-panel"
                id="signin-tab"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={
                  'w-1/2 py-2 rounded-md text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ' +
                  (activeTab === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900')
                }
                role="tab"
                aria-selected={activeTab === 'signup'}
                aria-controls="signup-panel"
                id="signup-tab"
              >
                Sign Up
              </button>
            </div>
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4" role="tabpanel" id={activeTab === 'signin' ? 'signin-panel' : 'signup-panel'} aria-labelledby={activeTab === 'signin' ? 'signin-tab' : 'signup-tab'}>
            <form
              className="mt-4 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
              noValidate
            >
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-800">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={
                    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 ' +
                    (errors.email ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-slate-200')
                  }
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-800">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                    required
                    minLength={8}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={
                      'w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm outline-none transition placeholder:text-slate-400 ' +
                      (errors.password ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-slate-200')
                    }
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-2 my-1 inline-flex items-center rounded px-2 text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              {activeTab === 'signup' && (
                <>
                  <div className="grid gap-1.5">
                    <label htmlFor="confirm-password" className="text-sm font-medium text-slate-800">Confirm Password</label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 ' +
                        (errors.confirmPassword ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-slate-200')
                      }
                      placeholder="Re-enter your password"
                    />
                    {errors.confirmPassword && (
                      <p id="confirm-password-error" role="alert" className="text-xs text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <label htmlFor="display-name" className="text-sm font-medium text-slate-800">Display Name <span className="text-slate-400" aria-hidden="true">(optional)</span></label>
                    <input
                      id="display-name"
                      name="displayName"
                      type="text"
                      autoComplete="name"
                      aria-invalid={false}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200"
                      placeholder="Your name (optional)"
                    />
                  </div>
                </>
              )}

              <div className="grid gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
                >
                  {isLoading ? 'Please wait…' : 'Continue with Email'}
                </button>
                <button
                  type="button"
                  onClick={() => void onGoogleContinue()}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
                  aria-label="Continue with Google"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303C33.602,32.91,29.197,36,24,36c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.113,0,9.823-1.955,13.36-5.157l-6.164-5.205C29.197,36,24,36,24,36c-5.179,0-9.567-3.108-11.289-7.447 l-6.537,5.038C9.499,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.353,3.076-4.286,5.478-7.803,6.555 c0.001,0,0.001,0,0.001,0l6.164,5.205C32.846,40.659,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our
          <a href="#" className="mx-1 underline underline-offset-2 hover:text-slate-700">Terms</a>
          and
          <a href="#" className="ml-1 underline underline-offset-2 hover:text-slate-700">Privacy Policy</a>.
        </p>
      </div>

      <Toasts toasts={toasts} onClose={remove} />
    </div>
  );
}


