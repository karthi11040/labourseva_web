"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Briefcase,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
  Layers,
  Clock,
  ArrowRightLeft,
  FileCheck,
  Settings2,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  staffId: string;
  mobile: string;
  email: string;
  role: "SCRUTINY_OFFICER" | "DISTRICT_INSPECTOR" | "CLERK" | "SUPPORT_SPECIALIST";
  district: string;
  assignedServices: string[];
  activeTaskCount: number;
  completedTodayCount: number;
  avgTurnaroundHours: number;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  joinedDate: string;
}

interface DistrictOption {
  id: number;
  name: string;
  nameTa?: string | null;
}

const statutoryServiceOptions = [
  "BOCW Welfare Board Registration & Renewals",
  "Maternity & Child Care Assistance Grants",
  "Children Higher Education Scholarship Claims",
  "Natural / Accidental Death Relief Settlements",
  "Tool Kit Equipment Subsidy (Mason/Carpenter)",
  "Commercial Promotion & Ad Verification",
  "Citizen Grievance Redressal Investigations",
  "E-Service Statutory Document Signing",
];

const initialEmployees: Employee[] = [];

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [districts, setDistricts] = useState<DistrictOption[]>([]);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // New employee form
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [provisionMode, setProvisionMode] = useState<"invite" | "password">("invite");
  const [initialPassword, setInitialPassword] = useState("");
  const [createdStaffModal, setCreatedStaffModal] = useState<{
    name: string;
    email: string;
    inviteUrl?: string;
  } | null>(null);

  // Fetch real employees on load
  useEffect(() => {
    fetch("/api/admin/employees")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.employees)) {
          const mapped: Employee[] = data.employees.map((emp: any) => ({
            id: `EMP-${emp.id}`,
            name: emp.name,
            staffId: emp.staffCode || `TNG-EMP-${String(emp.id).padStart(6, "0")}`,
            mobile: emp.phone || "94430-XXXXX",
            email: emp.email,
            role: "SCRUTINY_OFFICER",
            district: "Chennai",
            assignedServices: [statutoryServiceOptions[0]],
            activeTaskCount: 0,
            completedTodayCount: 0,
            avgTurnaroundHours: 3.0,
            status: emp.status === "active" ? "ACTIVE" : "INACTIVE",
            joinedDate: emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : "Active",
          }));
          if (mapped.length > 0) setEmployees(mapped);
          if (Array.isArray(data.districts)) setDistricts(data.districts);
        }
      })
      .catch(() => {});
  }, []);

  // Permissions form
  const [checkedServices, setCheckedServices] = useState<string[]>([]);

  // Reassignment form
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [reassignCount, setReassignCount] = useState("5");
  const [reassignReason, setReassignReason] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.staffId.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.mobile.includes(search);
      const matchesDistrict = districtFilter === "ALL" || emp.district === districtFilter;
      const matchesRole = roleFilter === "ALL" || emp.role === roleFilter;
      return matchesSearch && matchesDistrict && matchesRole;
    });
  }, [employees, search, districtFilter, roleFilter]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newMobile.trim(),
          district: newDistrict,
          initialPassword: provisionMode === "password" ? initialPassword : "",
          sendInvitation: provisionMode === "invite",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(data.error || "Failed to create employee account.");
        return;
      }

      const newId = `EMP-${data.employee?.id || employees.length + 1}`;
      const newEntry: Employee = {
        id: newId,
        name: newName,
        staffId: data.employee?.staffCode || `TNG-EMP-${String(data.employee?.id || employees.length + 1).padStart(6, "0")}`,
        mobile: newMobile,
        email: newEmail,
        role: "SCRUTINY_OFFICER",
        district: newDistrict,
        assignedServices: [statutoryServiceOptions[0]],
        activeTaskCount: 0,
        completedTodayCount: 0,
        avgTurnaroundHours: 3.0,
        status: "ACTIVE",
        joinedDate: "Today",
      };

      setEmployees([newEntry, ...employees]);
      setAddModalOpen(false);

      if (data.inviteUrl) {
        setCreatedStaffModal({
          name: newName,
          email: newEmail,
          inviteUrl: data.inviteUrl,
        });
      } else {
        showToast(`Officer ${newName} successfully onboarded.`);
      }

      setNewName("");
      setNewMobile("");
      setNewEmail("");
      setInitialPassword("");
    } catch {
      showToast("Error creating employee account.");
    }
  };

  const handleOpenPermissions = (emp: Employee) => {
    setSelectedEmployee(emp);
    setCheckedServices([...emp.assignedServices]);
    setPermissionsModalOpen(true);
  };

  const toggleServicePermission = (srv: string) => {
    setCheckedServices((prev) =>
      prev.includes(srv) ? prev.filter((s) => s !== srv) : [...prev, srv]
    );
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === selectedEmployee.id ? { ...emp, assignedServices: checkedServices } : emp
      )
    );
    setPermissionsModalOpen(false);
    showToast(`Service dispatch permissions updated for ${selectedEmployee.name}.`);
  };

  const handleOpenReassign = (emp: Employee) => {
    setSelectedEmployee(emp);
    const other = employees.find((e) => e.id !== emp.id && e.status === "ACTIVE");
    setTargetEmployeeId(other ? other.id : "");
    setReassignCount("5");
    setReassignReason("");
    setReassignModalOpen(true);
  };

  const handleSaveReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !targetEmployeeId) return;
    const count = parseInt(reassignCount);
    if (isNaN(count) || count <= 0) return;

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === selectedEmployee.id) {
          return { ...emp, activeTaskCount: Math.max(0, emp.activeTaskCount - count) };
        }
        if (emp.id === targetEmployeeId) {
          return { ...emp, activeTaskCount: emp.activeTaskCount + count };
        }
        return emp;
      })
    );

    const target = employees.find((e) => e.id === targetEmployeeId);
    setReassignModalOpen(false);
    showToast(`Transferred ${count} pending tasks from ${selectedEmployee.name} to ${target?.name}.`);
  };

  const toggleEmployeeStatus = (emp: Employee) => {
    const nextStatus = emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setEmployees((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, status: nextStatus } : e))
    );
    showToast(`Staff status for ${emp.name} set to ${nextStatus}.`);
  };

  const exportCSV = () => {
    const headers = ["Employee ID", "Name", "Staff ID", "Role", "District", "Mobile", "Active Tasks", "Turnaround (Hrs)", "Status"];
    const rows = filteredEmployees.map((e) => [
      e.id,
      e.name,
      e.staffId,
      e.role,
      e.district,
      e.mobile,
      e.activeTaskCount,
      e.avgTurnaroundHours,
      e.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_employees_dispatch.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#2563eb] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/10 mb-3">
                <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                Staff Dispatch & Tasks (admin_employees.php)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Government Officers & Dispatch</h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                Assign statutory review permissions, balance workload queues, reassign applications between officers, and track turnaround SLAs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Staff Member
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">Active Staff</p>
              <p className="text-2xl font-black mt-1">
                {employees.filter((e) => e.status === "ACTIVE").length} Active
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Tasks in Scrutiny</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                {employees.reduce((sum, e) => sum + e.activeTaskCount, 0)} Pending
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Resolved Today</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                {employees.reduce((sum, e) => sum + e.completedTodayCount, 0)} Applications
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Avg SLA Turnaround</p>
              <p className="text-2xl font-black mt-1 text-white">
                {employees.length > 0 ? (employees.reduce((sum, e) => sum + e.avgTurnaroundHours, 0) / employees.length).toFixed(1) : "0.0"} Hours
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Officer Name, Staff ID, Mobile, or Email..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="ALL">All Districts</option>
              {districts.map((district) => <option key={district.id} value={district.name}>{district.name}{district.nameTa ? ` (${district.nameTa})` : ""}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="ALL">All Designations</option>
              <option value="SCRUTINY_OFFICER">Scrutiny Officer</option>
              <option value="DISTRICT_INSPECTOR">District Inspector</option>
              <option value="CLERK">Clerk</option>
              <option value="SUPPORT_SPECIALIST">Support Specialist</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">Officer &amp; Staff ID</th>
                <th className="px-5 py-4 whitespace-nowrap">Designation &amp; District</th>
                <th className="px-5 py-4 whitespace-nowrap">Assigned Services</th>
                <th className="px-5 py-4 whitespace-nowrap">Active Tasks &amp; Turnaround</th>
                <th className="px-5 py-4 whitespace-nowrap">Status</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No staff records match your criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base">{emp.name}</div>
                      <div className="text-xs font-mono text-[#1e3a8a] font-semibold mt-0.5">{emp.staffId}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{emp.mobile}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                        {emp.role.replace("_", " ")}
                      </span>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{emp.district}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenPermissions(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] text-xs font-bold border border-blue-200/60 transition-colors shrink-0"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{emp.assignedServices.length} Services Configured</span>
                      </button>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-700 text-sm">
                          {emp.activeTaskCount} pending
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-emerald-700 font-semibold">
                          {emp.completedTodayCount} done today
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>Avg SLA: {emp.avgTurnaroundHours}h</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : emp.status === "ON_LEAVE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : emp.status === "ON_LEAVE" ? (
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span>{emp.status.replace("_", " ")}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[130px]">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenPermissions(emp)}
                          title="Manage Service Permissions (employee_assigned_services)"
                          className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReassign(emp)}
                          title="Reassign Tasks & Balance Workload"
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors shrink-0"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEmployeeStatus(emp)}
                          title={emp.status === "INACTIVE" ? "Activate Staff" : "Deactivate Staff"}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            emp.status === "INACTIVE"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                        >
                          {emp.status === "INACTIVE" ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add Staff Member */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Staff Onboarding · admin_employees.php
                </span>
                <h3 className="text-lg font-bold mt-0.5">Add Government Officer / Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name & Title
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. S. Thangadurai, M.A."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Staff ID Code</label>
                <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-sm font-mono font-semibold text-[#1e3a8a]">Generated automatically after account creation</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="94430-XXXXX"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="officer@labourseva.tn.gov.in"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">District</label>
                <select
                  required
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  <option value="">Select district</option>
                  {districts.map((district) => <option key={district.id} value={district.name}>{district.name}{district.nameTa ? ` (${district.nameTa})` : ""}</option>)}
                </select>
              </div>

              {/* Provisioning Mode */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Credential Provisioning Mode
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setProvisionMode("invite")}
                    className={`p-2.5 rounded-lg border font-bold text-left transition-all ${
                      provisionMode === "invite"
                        ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">Invitation Link</span>
                    <span className="text-[10px] text-slate-500 font-normal">Single-use token (24h)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProvisionMode("password")}
                    className={`p-2.5 rounded-lg border font-bold text-left transition-all ${
                      provisionMode === "password"
                        ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">Direct Password</span>
                    <span className="text-[10px] text-slate-500 font-normal">Set initial credentials</span>
                  </button>
                </div>

                {provisionMode === "password" && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Initial Temporary Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={initialPassword}
                      onChange={(e) => setInitialPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] cursor-pointer"
                >
                  Create Employee Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Employee Account Created with Invitation Link */}
      {createdStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Employee Account Created</h3>
                <p className="text-xs text-slate-500">{createdStaffModal.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Officer <strong>{createdStaffModal.name}</strong> has been provisioned. Provide the following secure onboarding link to the employee:
            </p>

            {createdStaffModal.inviteUrl && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Single-Use Set Password Link:</span>
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}${createdStaffModal.inviteUrl}`}
                  className="w-full p-2 text-[11px] font-mono bg-white border border-slate-300 rounded text-slate-800 select-all"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Valid for 24 hours. Will automatically expire after single use.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setCreatedStaffModal(null)}
              className="w-full py-2.5 text-xs font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] transition-colors cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Service Permissions Assignment */}
      {permissionsModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Permission Matrix · employee_assigned_services
                </span>
                <h3 className="text-lg font-bold mt-0.5">Services: {selectedEmployee.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPermissionsModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-500">
                Incoming citizen and retailer applications for selected service catalogues will automatically route to this officer:
              </p>

              <div className="space-y-2 border border-slate-200 rounded-xl p-3 divide-y divide-slate-100">
                {statutoryServiceOptions.map((srv) => (
                  <label key={srv} className="flex items-center gap-3 py-2 cursor-pointer text-xs font-medium text-slate-800 hover:text-[#1e3a8a]">
                    <input
                      type="checkbox"
                      checked={checkedServices.includes(srv)}
                      onChange={() => toggleServicePermission(srv)}
                      className="rounded text-[#1e3a8a] focus:ring-[#1e3a8a] w-4 h-4"
                    />
                    <span>{srv}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
                >
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reassign Tasks */}
      {reassignModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Task Dispatch Rebalance
                </span>
                <h3 className="text-lg font-bold mt-0.5">Reassign from {selectedEmployee.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReassign} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                Current Pending Backlog: <strong className="text-amber-700">{selectedEmployee.activeTaskCount} applications</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Assignee (Online Officer)
                </label>
                <select
                  required
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  {employees
                    .filter((e) => e.id !== selectedEmployee.id && e.status === "ACTIVE")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.district} · {e.activeTaskCount} active tasks)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Number of Applications to Transfer
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedEmployee.activeTaskCount || 1}
                  required
                  value={reassignCount}
                  onChange={(e) => setReassignCount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Handover Notes / Statutory Justification
                </label>
                <textarea
                  rows={2}
                  required
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Leave coverage or high-priority SLA expedited processing..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg shadow-sm"
                >
                  Reassign Applications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
