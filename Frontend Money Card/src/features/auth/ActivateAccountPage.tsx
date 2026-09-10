import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks';
import { apiService } from '@/services/api';
import {
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Building2,
  ArrowRight,
  Loader2,
  Check,
  X,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token') || '';

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [invitee, setInvitee] = useState<{
    name: string;
    email: string;
    role: string;
    organizationName: string | null;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify activation token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenError('No activation token was provided in the link. Please check your invitation email.');
      return;
    }

    setIsVerifying(true);
    setTokenError(null);

    apiService.auth
      .verifyActivationToken(token)
      .then((res: any) => {
        if (res.success && res.data?.valid) {
          setInvitee(res.data.user);
        } else {
          setTokenError(res.error?.message || 'This activation link is invalid or has expired.');
        }
      })
      .catch(() => {
        setTokenError('Unable to connect to the server. Please try again.');
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [token]);

  // Password complexity checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setPasswordError(null);
      setConfirmError(null);

      let hasErrors = false;

      if (!password) {
        setPasswordError('Password is required');
        hasErrors = true;
      } else if (!isPasswordValid) {
        setPasswordError('Please satisfy all password security requirements');
        hasErrors = true;
      }

      if (!confirmPassword) {
        setConfirmError('Please confirm your password');
        hasErrors = true;
      } else if (password && confirmPassword !== password) {
        setConfirmError('Passwords do not match');
        hasErrors = true;
      }

      if (hasErrors) return;

      setIsSubmitting(true);
      try {
        const res = await apiService.auth.activateAccount({
          token,
          password,
          confirmPassword,
        });

        if (!res.success) {
          setSubmitError(res.error?.message || 'Failed to activate account.');
          return;
        }

        setIsSuccess(true);

        const activatedUser = res.data?.user || invitee;
        const isStaff = activatedUser?.role === 'STAFF';

        // Seamless auto-login only for Admin roles that access the web dashboard
        if (!isStaff && res.data?.accessToken && res.data?.user) {
          login(res.data.user, res.data.accessToken);
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1200);
        }
      } catch {
        setSubmitError('Unable to connect to the server. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, password, confirmPassword, isPasswordValid, login, navigate],
  );

  // 1. Loading state
  if (isVerifying) {
    return (
      <Card padding="lg" className="text-center">
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">Verifying Invitation Link</h3>
          <p className="mt-1 text-xs text-slate-500">Validating your one-time activation token...</p>
        </div>
      </Card>
    );
  }

  // 2. Error / Expired state
  if (tokenError || !invitee) {
    return (
      <Card padding="lg">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Activation Link Invalid</h2>
            <p className="mt-2 text-sm text-slate-500">
              {tokenError || 'This activation link has expired or has already been used.'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">Need a new invitation?</p>
            <p>Please contact your Organization Administrator or Platform Manager to trigger a fresh invitation link.</p>
          </div>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Return to Sign In <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // 3. Success state
  if (isSuccess) {
    const isStaff = invitee?.role === 'STAFF';

    if (isStaff) {
      return (
        <Card padding="lg">
          <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Staff Account Activated!</h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Welcome to the team, <strong className="text-slate-900">{invitee?.name}</strong>. Your password has been successfully configured.
              </p>
            </div>

            {/* Mobile POS App Guidance Card */}
            <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <span>Next Step: Sign In via Mobile POS Terminal</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                As a staff member for <strong>{invitee?.organizationName || 'Money Card'}</strong>, you will operate card issuing, recharging, and billing using the <strong>Money Card POS App</strong> on your counter device or smartphone.
              </p>
              <div className="rounded-lg bg-white p-3 border border-emerald-200/60 text-xs text-slate-700 space-y-2 font-medium">
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white font-bold mt-0.5">1</span>
                  <span>Launch the <strong>Money Card POS</strong> application on your mobile device or terminal</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white font-bold mt-0.5">2</span>
                  <span>Enter your email (<code>{invitee?.email}</code>) and your new password</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white font-bold mt-0.5">3</span>
                  <span>Select your assigned counter/branch to start issuing cards and taking payments</span>
                </div>
              </div>
            </div>

            <div className="pt-2 w-full">
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
              >
                Close & Return to Sign In
              </Link>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card padding="lg" className="text-center">
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Account Activated Successfully!</h2>
            <p className="mt-1 text-sm text-slate-500">
              Welcome aboard, <strong className="text-slate-800">{invitee?.name}</strong>. Redirecting you to your dashboard...
            </p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      </Card>
    );
  }

  // 4. Set Password Form
  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Account Activation</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome to {invitee.organizationName || 'Money Card'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Hi <strong className="text-slate-800">{invitee.name}</strong> ({invitee.email}), please choose a secure password to complete your account setup.
          </p>
        </div>

        {invitee.organizationName && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Building2 className="h-5 w-5 text-slate-400" />
            <div>
              <div className="text-xs font-medium text-slate-500">Assigned Organization</div>
              <div className="text-sm font-semibold text-slate-800">{invitee.organizationName}</div>
            </div>
          </div>
        )}

        {submitError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-sm text-rose-800 font-medium">{submitError}</p>
          </div>
        )}

        <div className="space-y-4">
          <Input
            id="activate-password"
            label="Create New Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
              if (submitError) setSubmitError(null);
            }}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer p-1"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={passwordError ?? undefined}
            disabled={isSubmitting}
            aria-required="true"
          />

          {/* Realtime password requirements checklist */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-xs">
            <p className="font-semibold text-slate-800">Password Security Requirements:</p>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : ''}`}>
                {hasMinLength ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-400" />}
                <span>8+ Characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700 font-medium' : ''}`}>
                {hasUppercase ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-400" />}
                <span>Uppercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-700 font-medium' : ''}`}>
                {hasLowercase ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-400" />}
                <span>Lowercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : ''}`}>
                {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-400" />}
                <span>Number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-700 font-medium' : ''}`}>
                {hasSpecial ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-400" />}
                <span>Special Symbol (!@#$%^&*...)</span>
              </div>
            </div>
          </div>

          <Input
            id="activate-confirm-password"
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError) setConfirmError(null);
            }}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer p-1"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={confirmError ?? undefined}
            disabled={isSubmitting}
            aria-required="true"
          />
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="w-full"
          leftIcon={<KeyRound className="h-4 w-4" />}
        >
          Activate Account & Sign In
        </Button>
      </form>
    </Card>
  );
}
