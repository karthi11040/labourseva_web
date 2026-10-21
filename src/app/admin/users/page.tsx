"use client";

import { useState } from "react";
import {
  UserCog,
  Plus,
  Search,
  Filter,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Lock,
  Phone,
  Mail,
  Edit,
  Trash2,
  X,
  ShieldCheck,
} from "lucide-react";

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "superadmin" | "admin" | "staff";
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  lastLogin: string;
}

const initialUsers: AdminUserItem[] = [
  {
    id: "USR-001",
    name: "System Superadmin",
    email: "lla@gmail.com",
    phone: "—",
    role: "superadmin",
    status: "ACTIVE",
    lastLogin: "Active Now (Current Session)",
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal for new admin / password reset
  const [addUserModal, setAddUserModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState<AdminUserItem | null>(null);

  // Form fields
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"superadmin" | "admin" | "staff">("admin");
  const [newPassword, setNewPassword] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newUser: AdminUserItem = {
      id: `USR-${String(users.length + 1).padStart(3, "0")}`,
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || "+91 90000 00000",
      role: newRole,
      status: "ACTIVE",
      lastLogin: "Never (New Account)",
    };

    setUsers([...users, newUser]);
    showToast(`Administrator account created for ${newName}.`);
    setAddUserModal(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewPassword("");
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal) return;
    showToast(`Password successfully updated for ${passwordModal.name}.`);
    setPasswordModal(null);
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.id.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            Identity &amp; Access Governance (admin_users.php)
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            System Administrators &amp; Operators
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Manage authenticated administrators, operations staff permissions, password hashes, and session lockout states.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddUserModal(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1e40af] shrink-0"
        >
          <Plus className="w-4 h-4" /> Add System User
        </button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#1e3a8a]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Super Administrators</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{users.filter((u) => u.role === "superadmin").length}</p>
          <p className="mt-1 text-xs text-purple-700 font-medium">Unrestricted Platform Privileges</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-blue-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Admins</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{users.filter((u) => u.role === "admin").length}</p>
          <p className="mt-1 text-xs text-slate-500">Zonal Review &amp; Sanctions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-emerald-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operations Staff</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{users.filter((u) => u.role === "staff").length}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Verification Desk Active</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Lockouts</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{users.filter((u) => u.status === "LOCKED").length}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">No brute-force flags</p>
        </div>
      </div>

      {/* Users Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, role, or phone..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Role:
            </span>
            {(["ALL", "superadmin", "admin", "staff"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === r
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r === "ALL" ? "All Roles" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">ID</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Officer Name</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Email &amp; Contact</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Role Privileges</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Last Active</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                    {u.id}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <strong className="block text-slate-900 font-bold text-xs">{u.name}</strong>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{u.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{u.phone}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === "superadmin"
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : u.role === "admin"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-slate-100 text-slate-800 border border-slate-200"
                      }`}
                    >
                      <Shield size={10} className="shrink-0" />
                      <span>{u.role.toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {u.lastLogin}
                  </td>
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>{u.status}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap min-w-[150px]">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPasswordModal(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold shrink-0"
                        title="Reset officer password"
                      >
                        <Key className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Reset Password</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              No administrative users match the filter criteria.
            </div>
          )}
        </div>
      </section>

      {/* Add User Modal */}
      {addUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#1e3a8a] text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserCog className="w-4 h-4" /> Add System User (admin_users.php)
              </h3>
              <button type="button" onClick={() => setAddUserModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. S. Ramanathan"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. ramanathan.s@labourseva.tn.gov.in"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 94440 00000"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">System Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as typeof newRole)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Operations Staff</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password (Min 12 chars)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                Credentials are saved with <code>bcrypt / password_hash</code> hashing.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddUserModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-xs font-bold text-white hover:bg-[#1e40af]"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-600 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Key className="w-4 h-4" /> Reset Password: {passwordModal.name}
              </h3>
              <button type="button" onClick={() => setPasswordModal(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Generate a new secure credentials hash for <strong>{passwordModal.email}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password (Min 12 chars)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  placeholder="Enter new administrator password..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModal(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Update Password Hash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
