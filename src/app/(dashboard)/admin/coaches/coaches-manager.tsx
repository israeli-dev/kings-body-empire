"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  coachToggleTarget,
  initialsForName,
  roleLabel,
  type AdminUserSummary,
  type RoleCounts,
  type RoleFilter,
} from "@/lib/admin-users-core";
import type { UserRole } from "@/types";

export type AdminUser = AdminUserSummary;
export type { RoleCounts };

const FILTERS: { value: RoleFilter; label: string; countKey: keyof RoleCounts }[] = [
  { value: "ALL", label: "All users", countKey: "total" },
  { value: "CLIENT", label: "Clients", countKey: "CLIENT" },
  { value: "COACH", label: "Coaches", countKey: "COACH" },
  { value: "ADMIN", label: "Admins", countKey: "ADMIN" },
];

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  ADMIN: "border-gold/40 bg-gold/10 text-gold",
  COACH: "border-success/40 bg-success/10 text-success",
  CLIENT: "text-muted",
};

export function CoachesManager({
  initialUsers,
  initialCounts,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  initialCounts: RoleCounts;
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [counts, setCounts] = useState<RoleCounts>(initialCounts);
  const [total, setTotal] = useState(initialCounts.total);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const isFirstRender = useRef(true);

  // Debounced search against GET /api/admin/users (name/email contains).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (query.trim()) params.set("q", query.trim());
        if (roleFilter !== "ALL") params.set("role", roleFilter);

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as {
          users?: AdminUser[];
          total?: number;
          counts?: RoleCounts;
          error?: string;
        };

        if (!res.ok) {
          setError(data.error || "Could not search users.");
          return;
        }

        setUsers(data.users ?? []);
        setTotal(data.total ?? (data.users?.length ?? 0));
        if (data.counts) setCounts(data.counts);
        setError("");
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setError("Could not search users. Check your connection and try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, roleFilter, refreshKey]);

  function askToChangeRole(user: AdminUser, newRole: UserRole) {
    setError("");
    setMessage("");
    setConfirmingId(user.id);
    setPendingRole(newRole);
  }

  function cancelConfirm() {
    setConfirmingId(null);
    setPendingRole(null);
  }

  async function confirmRoleChange(user: AdminUser) {
    if (!pendingRole) return;
    const newRole = pendingRole;

    setUpdatingId(user.id);
    setError("");

    const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = (await res.json().catch(() => ({}))) as AdminUser & { error?: string };
    setUpdatingId(null);

    if (!res.ok) {
      setError(data.error || "Could not update that user's role.");
      cancelConfirm();
      return;
    }

    // Re-fetch the list + role-filter totals so the table can't drift from
    // the database after a role change (e.g. promoting a coach while the
    // "Clients" filter is active).
    setRefreshKey((key) => key + 1);
    setMessage(
      newRole === "COACH"
        ? `${user.name} is now a Coach. They'll see coach access the next time they sign in.`
        : `${user.name} is now a ${roleLabel(newRole)}.`,
    );
    cancelConfirm();
    router.refresh();
  }

  function clearSearch() {
    setQuery("");
    setRoleFilter("ALL");
  }

  const searching = query.trim() !== "" || roleFilter !== "ALL";

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <label className="label" htmlFor="admin-user-search">
            Search users
          </label>
          <div className="relative">
            <input
              id="admin-user-search"
              type="search"
              className="input pr-10"
              placeholder="Search by name or email…"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm text-muted hover:text-ink"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Matches part of a name or email address — e.g. try <span className="text-ink">ada</span> or{" "}
            <span className="text-ink">@gmail.com</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
          {FILTERS.map((filter) => {
            const active = roleFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setRoleFilter(filter.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-gold/60 bg-panel2 text-gold"
                    : "border-line bg-panel text-muted hover:border-gold/40 hover:text-ink"
                }`}
              >
                {filter.label}
                <span className="ml-1.5 opacity-80">{counts[filter.countKey]}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted" aria-live="polite">
          {loading
            ? "Searching…"
            : searching
              ? `Showing ${users.length} of ${total} matching user${total === 1 ? "" : "s"}`
              : `${counts.total} user${counts.total === 1 ? "" : "s"} · ${counts.COACH} coach${counts.COACH === 1 ? "" : "es"}${counts.total > users.length ? ` — showing newest ${users.length}` : ""}`}
        </p>

        {error && <p className="alert-error">{error}</p>}
        {message && <p className="alert-success">{message}</p>}

        <ul className="divide-y divide-line">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const toggleTarget = coachToggleTarget(user.role);
            const confirming = confirmingId === user.id && pendingRole;
            const updating = updatingId === user.id;

            return (
              <li key={user.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-line bg-panel2 text-xs font-bold text-gold"
                    >
                      {initialsForName(user.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span className="truncate">{user.name}</span>
                        {isSelf && <span className="tag">You</span>}
                        <span className={`tag ${ROLE_BADGE_STYLES[user.role]}`}>
                          {roleLabel(user.role)}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {user.rank} · joined{" "}
                        {new Date(user.createdAt).toLocaleDateString("en-NG", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-none flex-wrap items-center gap-2">
                    {isSelf ? (
                      <span className="text-xs text-muted">Your own role can&apos;t be changed here.</span>
                    ) : confirming ? (
                      <div className="w-full min-w-[260px] rounded-xl border border-line bg-panel2 p-3 sm:w-auto">
                        <p className="text-sm">
                          {pendingRole === "COACH" && user.role === "CLIENT"
                            ? `Make ${user.name} a coach?`
                            : pendingRole === "CLIENT" && user.role === "COACH"
                              ? `Remove coach access from ${user.name}? They'll go back to Client.`
                              : `Change ${user.name}'s role from ${roleLabel(user.role)} to ${roleLabel(pendingRole)}?`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={updating}
                            onClick={() => confirmRoleChange(user)}
                          >
                            {updating ? "Saving…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={updating}
                            onClick={cancelConfirm}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {toggleTarget === "COACH" && (
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => askToChangeRole(user, "COACH")}
                          >
                            Make coach
                          </button>
                        )}
                        {toggleTarget === "CLIENT" && (
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => askToChangeRole(user, "CLIENT")}
                          >
                            Remove coach
                          </button>
                        )}
                        <label className="sr-only" htmlFor={`role-${user.id}`}>
                          Change role for {user.name}
                        </label>
                        <select
                          id={`role-${user.id}`}
                          className="input w-auto py-1.5 text-xs"
                          value={user.role}
                          onChange={(event) => {
                            const next = event.target.value as UserRole;
                            if (next !== user.role) askToChangeRole(user, next);
                          }}
                        >
                          <option value="CLIENT">Client</option>
                          <option value="COACH">Coach</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {users.length === 0 && !loading && (
            <li className="py-8 text-center">
              <p className="text-sm text-muted">
                {searching
                  ? "No users match that search."
                  : "No users yet. The first signup will appear here."}
              </p>
              {searching && (
                <button type="button" className="btn-secondary btn-sm mt-3" onClick={clearSearch}>
                  Clear search &amp; filters
                </button>
              )}
            </li>
          )}
        </ul>
      </section>

      <p className="text-xs text-muted">
        Role changes apply to the account immediately, but the person&apos;s current session keeps
        the old role until they sign in again — that&apos;s how the login session works.
      </p>
    </div>
  );
}
