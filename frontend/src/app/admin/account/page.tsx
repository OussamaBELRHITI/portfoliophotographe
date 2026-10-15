"use client";

import { useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/admin/icons";
import { Alert, Button, Card, Input, PageHeader } from "@/components/admin/ui";
import { ApiError, authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const MIN_PASSWORD = 8;

/**
 * The signed-in admin changes their own username and password. The current password is
 * required for any change, so an unattended open dashboard can't be used to lock the owner out.
 */
export default function AccountPage() {
  const { token, username, applySession } = useAuth();

  const [newUsername, setNewUsername] = useState(username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const usernameChanged = newUsername.trim() !== (username ?? "");
  const passwordChanged = newPassword.length > 0;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = passwordChanged && newPassword.length < MIN_PASSWORD;
  const canSave =
    (usernameChanged || passwordChanged) &&
    currentPassword.length > 0 &&
    newUsername.trim().length > 0 &&
    !tooShort &&
    !mismatch &&
    (!passwordChanged || confirmPassword.length > 0);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token || !canSave) return;

    setBusy(true);
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    try {
      const res = await authApi.updateAccount(token, {
        currentPassword,
        username: newUsername.trim(),
        newPassword: passwordChanged ? newPassword : undefined,
      });
      // The server issues a new token: the old one names the previous username.
      applySession(res);
      setNewUsername(res.username);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(
        usernameChanged && passwordChanged
          ? "Your username and password have been changed."
          : usernameChanged
            ? "Your username has been changed."
            : "Your password has been changed.",
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Could not reach the server. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const passwordType = showPasswords ? "text" : "password";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Account"
        description="Change the username and password you use to sign in to this dashboard."
      />

      {error && (
        <div className="mb-6">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-6">
          <Alert kind="success">{success} Use the new details next time you sign in.</Alert>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <Card className="space-y-5 p-6">
          <div>
            <h2 className="text-base font-semibold">Sign-in details</h2>
            <p className="mt-1 text-sm text-fg-subtle">
              Leave the new password empty to keep your current one.
            </p>
          </div>

          <Input
            label="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            error={fieldErrors.username}
            hint="Letters, numbers, dots, dashes or underscores — no spaces."
            autoComplete="username"
            required
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="New password"
              type={passwordType}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={
                tooShort ? `At least ${MIN_PASSWORD} characters` : fieldErrors.newPassword
              }
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type={passwordType}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={mismatch ? "The passwords don't match" : undefined}
              autoComplete="new-password"
              disabled={!passwordChanged}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="flex items-center gap-2 text-sm text-fg-subtle transition-colors hover:text-fg"
          >
            {showPasswords ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>
        </Card>

        <Card className="space-y-5 p-6">
          <div>
            <h2 className="text-base font-semibold">Confirm it&apos;s you</h2>
            <p className="mt-1 text-sm text-fg-subtle">
              Enter your current password to save these changes.
            </p>
          </div>
          <Input
            label="Current password"
            type={passwordType}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
            required
          />
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !canSave}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
