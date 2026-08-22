import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface Preferences {
  accountEmail: boolean;
  eventEmail: boolean;
  announcementEmail: boolean;
}

export default function AccountSecurity() {
  const { user, loading, csrfToken, signOutAll, refreshSession } = useAuth();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void apiRequest<Preferences>("/account/notification-preferences")
      .then(setPreferences)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load preferences."));
  }, [user]);

  if (loading) return <Layout><section className="py-24"><div className="container">Loading account...</div></section></Layout>;
  if (!user) return <Layout><section className="py-24"><div className="container max-w-lg text-center"><p>Sign in to manage account security.</p><Link to="/auth" className="text-primary hover:underline">Sign in</Link></div></section></Layout>;

  const savePreferences = async (next: Preferences) => {
    if (!csrfToken) return;
    setPreferences(next);
    try {
      await apiRequest("/account/notification-preferences", { method: "PATCH", csrfToken, body: next });
      toast.success("Notification preferences saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preferences.");
    }
  };

  const requestEmailChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csrfToken) return;
    setBusy(true);
    try {
      await apiRequest("/auth/change-email/request", { method: "POST", csrfToken, body: { email: newEmail, password } });
      setPassword("");
      toast.success("Check the new address for a confirmation link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request the email change.");
    } finally { setBusy(false); }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csrfToken) return;
    if (newPassword !== confirmPassword) {
      toast.error("The new password confirmation does not match.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        csrfToken,
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshSession();
      toast.success("Password changed. Other signed-in devices were revoked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change the password.");
    } finally { setBusy(false); }
  };

  const updateOnboarding = async (status: "COMPLETED" | "DISMISSED") => {
    if (!csrfToken) return;
    await apiRequest("/auth/onboarding", { method: "POST", csrfToken, body: { status } });
    await refreshSession();
    toast.success(status === "COMPLETED" ? "Onboarding completed." : "Onboarding dismissed.");
  };

  const requestDeletion = async () => {
    if (!csrfToken || !window.confirm("Request account deletion and sign out every device? This must be reviewed by an administrator.")) return;
    setBusy(true);
    try {
      await apiRequest("/account/deletion-request", { method: "POST", csrfToken, body: { reason: deletionReason || undefined } });
      toast.success("Deletion request recorded.");
      window.location.assign("/auth");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request deletion.");
      setBusy(false);
    }
  };

  return (
    <Layout><section className="py-20"><div className="container max-w-3xl space-y-6">
      <div><h1 className="font-display text-3xl font-bold text-gradient">Account & security</h1><p className="text-muted-foreground mt-2">Community account for {user.email}. Club membership is managed separately.</p></div>

      {user.mustChangePassword && <section className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-6"><h2 className="font-semibold text-lg">Password change required</h2><p className="text-sm text-muted-foreground mt-2">This account is using its temporary administrator password. Set a private password before using the administration workspace.</p></section>}

      <section className="rounded-xl glass p-6"><h2 className="font-semibold text-lg">Change password</h2><p className="text-sm text-muted-foreground my-2">Use at least 12 characters. Changing it revokes every other active session.</p>
        <form onSubmit={changePassword} className="space-y-3"><input type="password" required minLength={12} maxLength={128} autoComplete="current-password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border" /><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border" /><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border" /><button disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">Change password</button></form>
      </section>

      <section className="rounded-xl glass p-6 space-y-4"><h2 className="font-semibold text-lg">Notification preferences</h2>
        {preferences && (Object.keys(preferences) as (keyof Preferences)[]).map((key) => (
          <label key={key} className="flex items-center justify-between gap-4 text-sm"><span>{key === "accountEmail" ? "Essential account email" : key === "eventEmail" ? "Event email" : "Announcement email"}</span><input type="checkbox" checked={preferences[key]} disabled={key === "accountEmail"} onChange={(event) => void savePreferences({ ...preferences, [key]: event.target.checked })} /></label>
        ))}
      </section>

      {!user.fixedSuperAdmin && <section className="rounded-xl glass p-6"><h2 className="font-semibold text-lg">Change email</h2><p className="text-sm text-muted-foreground my-2">A confirmation link is sent to the new address. Completing it signs out every session.</p>
        <form onSubmit={requestEmailChange} className="space-y-3"><input type="email" required maxLength={254} placeholder="New email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border" /><input type="password" required autoComplete="current-password" placeholder="Current password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border" /><button disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">Send confirmation</button></form>
      </section>}

      {user.fixedSuperAdmin && <section className="rounded-xl glass p-6"><h2 className="font-semibold text-lg">Fixed super administrator</h2><p className="text-sm text-muted-foreground mt-2">This email address and SUPER_ADMIN role are protected by D1 database triggers. The password remains fully changeable.</p></section>}

      {user.onboardingStatus === "PENDING" && <section className="rounded-xl glass p-6"><h2 className="font-semibold text-lg">Account onboarding</h2><p className="text-sm text-muted-foreground my-2">Mark the community account introduction as complete, or dismiss it.</p><div className="flex gap-3"><button onClick={() => void updateOnboarding("COMPLETED")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">Complete</button><button onClick={() => void updateOnboarding("DISMISSED")} className="px-4 py-2 rounded-lg border border-border">Dismiss</button></div></section>}

      <section className="rounded-xl glass p-6"><h2 className="font-semibold text-lg">Sessions</h2><p className="text-sm text-muted-foreground my-2">Revoke this and every other active session.</p><button onClick={() => void signOutAll()} className="px-4 py-2 rounded-lg border border-border">Sign out all devices</button></section>

      {!user.fixedSuperAdmin && <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-6"><h2 className="font-semibold text-lg text-destructive">Request account deletion</h2><p className="text-sm text-muted-foreground my-2">This records a reviewable request and immediately revokes every session. It does not silently erase audit records.</p><textarea maxLength={1000} placeholder="Optional reason" value={deletionReason} onChange={(event) => setDeletionReason(event.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border" /><button disabled={busy} onClick={() => void requestDeletion()} className="mt-3 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50">Request deletion</button></section>}
    </div></section></Layout>
  );
}
