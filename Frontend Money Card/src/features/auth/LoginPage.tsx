import { AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';
// ─── Login Page ────────────────────────────────────────────
// Web Authentication — SUPER_ADMIN, ORG_ADMIN, and Counter Managers (STAFF).
// Uses apiService abstraction — does NOT import mock handlers directly.

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks';
import { apiService } from '@/services/api';

// ── Identifier Validation (Email or 10-digit Mobile) ──────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

function validateIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Email or Mobile Number is required';
  const isDigits = /^\d+$/.test(trimmed);
  if (isDigits) {
    if (!PHONE_REGEX.test(trimmed)) {
      return 'Please enter a valid 10-digit mobile number';
    }
    return null;
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address or 10-digit mobile number';
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  return null;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionExpired = searchParams.get('expired') === 'true';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setApiError(null);

      // Client-side validation
      const idErr = validateIdentifier(identifier);
      const pErr = validatePassword(password);
      setIdentifierError(idErr);
      setPasswordError(pErr);
      if (idErr || pErr) return;

      setIsSubmitting(true);
      try {
        const trimmed = identifier.trim();
        const isDigits = /^\d+$/.test(trimmed);
        const credentials = isDigits
          ? { phone: trimmed, password }
          : { email: trimmed, password };

        const result = await apiService.auth.login(credentials);

        if (!result.success) {
          setApiError(result.error.message || 'Invalid credentials');
          return;
        }

        const { user, accessToken, refreshToken } = result.data;

        login(user, accessToken, refreshToken);

        // If user must change temporary password, redirect immediately to /change-password
        if (user.mustChangePassword) {
          navigate('/change-password', { replace: true });
        } else {
          // Redirect to intended destination or dashboard
          const redirectTo = searchParams.get('redirect') || '/dashboard';
          navigate(redirectTo, { replace: true });
        }
      } catch {
        setApiError('Unable to connect to the server. Please check your network and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [identifier, password, login, navigate, searchParams],
  );

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your dashboard</p>
        </div>

        {/* Session expired notice */}
        {sessionExpired && !apiError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800 font-medium">
              Your session has expired. Please sign in again.
            </p>
          </div>
        )}

        {/* API error */}
        {apiError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-sm text-rose-800 font-medium">{apiError}</p>
          </div>
        )}

        {/* Email or Phone field */}
        <Input
          id="login-identifier"
          label="Email or Mobile Number"
          type="text"
          placeholder="admin@example.com or 10-digit mobile"
          autoComplete="username"
          autoFocus
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (identifierError) setIdentifierError(null);
            if (apiError) setApiError(null);
          }}
          error={identifierError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!identifierError}
          aria-describedby={identifierError ? 'login-identifier-error' : undefined}
        />

        {/* Password field */}
        <Input
          id="login-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
            if (apiError) setApiError(null);
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
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? 'login-password-error' : undefined}
        />

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<LogIn className="h-4 w-4" />}
        >
          Sign In
        </Button>

        {/* Forgot password link */}
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:rounded"
          >
            Forgot your password?
          </Link>
        </div>


      </form>
    </Card>
  );
}
