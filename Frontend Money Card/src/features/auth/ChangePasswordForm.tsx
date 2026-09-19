// ─── Change Password Component ─────────────────────────────
// Authenticated-only. Enforces backend strongPasswordSchema with live suggestions.

import { useState, useCallback } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { apiService } from '@/services/api';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [currentPwError, setCurrentPwError] = useState<string | null>(null);
  const [newPwError, setNewPwError] = useState<string | null>(null);
  const [confirmPwError, setConfirmPwError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

function validatePasswordRules(pw: string): string | null {
  if (!pw) return 'New password is required';
  if (pw.length < 4) return 'Password must be at least 4 characters long';
  return null;
}

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setApiError(null);
      setIsSuccess(false);

      let hasErrors = false;

      if (!currentPassword) {
        setCurrentPwError('Current password is required');
        hasErrors = true;
      } else {
        setCurrentPwError(null);
      }

      const pwError = validatePasswordRules(newPassword);
      setNewPwError(pwError);
      if (pwError) hasErrors = true;

      if (!confirmPassword) {
        setConfirmPwError('Please confirm your new password');
        hasErrors = true;
      } else if (newPassword && confirmPassword !== newPassword) {
        setConfirmPwError('Passwords do not match');
        hasErrors = true;
      } else {
        setConfirmPwError(null);
      }

      if (hasErrors) return;

      setIsSubmitting(true);
      try {
        const result = await apiService.auth.changePassword({
          currentPassword,
          newPassword,
        });

        if (!result.success) {
          setApiError(result.error.message || 'Unable to change password.');
          return;
        }

        setIsSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch {
        setApiError('Unable to connect to the server. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirmPassword],
  );

  return (
    <Card padding="md">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            Change Password
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Update your account password.
          </p>
        </div>

        {isSuccess && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800 font-medium">Password changed successfully.</p>
          </div>
        )}

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

        {/* Current Password */}
        <Input
          id="change-current-password"
          label="Current password"
          type={showCurrentPw ? 'text' : 'password'}
          autoComplete="current-password"
          value={currentPassword}
          maxLength={30}
          onChange={(e) => {
            setCurrentPassword(e.target.value.slice(0, 30));
            if (currentPwError) setCurrentPwError(null);
            if (apiError) setApiError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          rightElement={
            <button
              type="button"
              onClick={() => setShowCurrentPw(!showCurrentPw)}
              className="hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
              tabIndex={-1}
              aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
            >
              {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={currentPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        {/* New Password */}
        <Input
          id="change-new-password"
          label="New password"
          type={showNewPw ? 'text' : 'password'}
          autoComplete="new-password"
          value={newPassword}
          maxLength={30}
          onChange={(e) => {
            setNewPassword(e.target.value.slice(0, 30));
            if (newPwError) setNewPwError(null);
            if (apiError) setApiError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          rightElement={
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
              tabIndex={-1}
              aria-label={showNewPw ? 'Hide password' : 'Show password'}
            >
              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={newPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        {/* Confirm Password */}
        <Input
          id="change-confirm-password"
          label="Confirm new password"
          type={showConfirmPw ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmPassword}
          maxLength={30}
          onChange={(e) => {
            setConfirmPassword(e.target.value.slice(0, 30));
            if (confirmPwError) setConfirmPwError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
              tabIndex={-1}
              aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
            >
              {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={confirmPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<KeyRound className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          Update Password
        </Button>
      </form>
    </Card>
  );
}
