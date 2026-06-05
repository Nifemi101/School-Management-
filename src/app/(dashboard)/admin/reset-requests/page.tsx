"use client";

import { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Hash,
  BookOpen,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import {
  getResetRequests,
  approveResetRequest,
  declineResetRequest,
} from "@/app/actions/adminPasswordReset";

// ── Types ─────────────────────────────────────────────────────

type ResetRequest = {
  id: string;
  reference_number: string;
  full_name: string;
  role: "student" | "teacher";
  status: "pending" | "approved" | "used" | "expired";
  temp_password: string | null;
  temp_password_expires_at: string | null;
  created_at: string;
  classes: { name: string }[] | null;
};

type FilterTab = "pending" | "approved" | "used" | "expired" | "all";

// ── Page ──────────────────────────────────────────────────────

export default function ResetRequestsPage() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");

  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    requestId: string;
    name: string;
    processing: boolean;
    tempPassword: string | null;
    error: string;
  }>({
    open: false,
    requestId: "",
    name: "",
    processing: false,
    tempPassword: null,
    error: "",
  });

  const [declineModal, setDeclineModal] = useState<{
    open: boolean;
    requestId: string;
    name: string;
    processing: boolean;
    error: string;
  }>({ open: false, requestId: "", name: "", processing: false, error: "" });

  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Data fetching ─────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const result = await getResetRequests();
    if (result.success && result.data) {
      setRequests(result.data as ResetRequest[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Derived data ──────────────────────────────────────────

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const filtered = requests.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

  // ── Actions ───────────────────────────────────────────────

  const handleApprove = async () => {
    setApproveModal((p) => ({ ...p, processing: true, error: "" }));
    const result = await approveResetRequest(approveModal.requestId);
    if (result.success && result.tempPassword) {
      setApproveModal((p) => ({
        ...p,
        processing: false,
        tempPassword: result.tempPassword!,
      }));
      fetchRequests();
    } else {
      setApproveModal((p) => ({
        ...p,
        processing: false,
        error: result.error ?? "Something went wrong.",
      }));
    }
  };

  const handleDecline = async () => {
    setDeclineModal((p) => ({ ...p, processing: true, error: "" }));
    const result = await declineResetRequest(declineModal.requestId);
    if (result.success) {
      closeDeclineModal();
      fetchRequests();
    } else {
      setDeclineModal((p) => ({
        ...p,
        processing: false,
        error: result.error ?? "Something went wrong.",
      }));
    }
  };

  const copyPassword = (pw: string) => {
    navigator.clipboard.writeText(pw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Modal helpers ─────────────────────────────────────────

  const openApproveModal = (r: ResetRequest, existingPw?: string) =>
    setApproveModal({
      open: true,
      requestId: r.id,
      name: r.full_name,
      processing: false,
      tempPassword: existingPw ?? null,
      error: "",
    });

  const closeApproveModal = () => {
    setApproveModal({
      open: false,
      requestId: "",
      name: "",
      processing: false,
      tempPassword: null,
      error: "",
    });
    setShowPassword(false);
  };

  const openDeclineModal = (r: ResetRequest) =>
    setDeclineModal({
      open: true,
      requestId: r.id,
      name: r.full_name,
      processing: false,
      error: "",
    });

  const closeDeclineModal = () =>
    setDeclineModal({
      open: false,
      requestId: "",
      name: "",
      processing: false,
      error: "",
    });

  // ── Render ────────────────────────────────────────────────

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "used", label: "Used" },
    { key: "expired", label: "Declined" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Password Reset Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Approve or decline student and teacher password reset requests.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-blue-600
            border border-gray-200 rounded-lg px-3 py-2 transition hover:border-blue-300 w-full sm:w-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Alert banner */}
      {!loading && pendingCount > 0 && (
        <div
          className="flex items-center gap-3 bg-amber-50 border border-amber-200
          rounded-xl px-4 py-3 mb-6"
        >
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">
              {pendingCount} pending request{pendingCount > 1 ? "s" : ""}
            </span>{" "}
            awaiting your approval.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-full sm:w-fit overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 bg-white
          border border-gray-100 rounded-2xl"
        >
          <KeyRound className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 font-medium">
            No {filter !== "all" ? filter : ""} requests
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onApprove={() => openApproveModal(r)}
              onDecline={() => openDeclineModal(r)}
              onViewPassword={() => openApproveModal(r, r.temp_password!)}
            />
          ))}
        </div>
      )}

      {/* ── Approve Modal ──────────────────────────────────── */}
      {approveModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {approveModal.tempPassword ? (
              // ── Password generated view ─────────────────
              <>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
                  Request Approved
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Hand this temporary password to{" "}
                  <span className="font-semibold text-gray-800">
                    {approveModal.name}
                  </span>{" "}
                  in person. It expires in 24 hours.
                </p>

                {/* Password box */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Temporary Password
                  </p>
                  <div className="flex items-center justify-between">
                    <code className="text-xl font-bold text-gray-900 tracking-wider">
                      {showPassword
                        ? approveModal.tempPassword
                        : "••••••••••••"}
                    </code>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowPassword((s) => !s)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-500"
                        title={showPassword ? "Hide" : "Show"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyPassword(approveModal.tempPassword!)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-500"
                        title="Copy"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-start gap-2 bg-amber-50 border border-amber-100
                  rounded-lg px-3 py-2 mb-5"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Do not share this digitally. Give it directly to the student
                    or teacher in person.
                  </p>
                </div>

                <button
                  onClick={closeApproveModal}
                  className="w-full py-2.5 text-sm font-medium text-white rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  }}
                >
                  Done
                </button>
              </>
            ) : (
              // ── Confirm approval view ───────────────────
              <>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
                  Approve Reset Request?
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  A temporary password will be generated for{" "}
                  <span className="font-semibold text-gray-800">
                    {approveModal.name}
                  </span>
                  . Their current password will be replaced immediately.
                </p>

                {approveModal.error && (
                  <p
                    className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg
                    px-3 py-2 text-center mb-4"
                  >
                    {approveModal.error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeApproveModal}
                    disabled={approveModal.processing}
                    className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200
                      rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={approveModal.processing}
                    className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg
                      disabled:opacity-60 flex items-center justify-center gap-2 transition"
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    }}
                  >
                    {approveModal.processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />{" "}
                        Generating...
                      </>
                    ) : (
                      "Approve & Generate"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Decline Modal ──────────────────────────────────── */}
      {declineModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
              Decline Request?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will decline the password reset request for{" "}
              <span className="font-semibold text-gray-800">
                {declineModal.name}
              </span>
              . They will need to submit a new request if they still need
              access.
            </p>

            {declineModal.error && (
              <p
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg
                px-3 py-2 text-center mb-4"
              >
                {declineModal.error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeDeclineModal}
                disabled={declineModal.processing}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200
                  rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={declineModal.processing}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600
                  rounded-lg disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {declineModal.processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Declining...
                  </>
                ) : (
                  "Yes, Decline"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request Card component ────────────────────────────────────

function RequestCard({
  request,
  onApprove,
  onDecline,
  onViewPassword,
}: {
  request: ResetRequest;
  onApprove: () => void;
  onDecline: () => void;
  onViewPassword: () => void;
}) {
  const statusStyles: Record<ResetRequest["status"], string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    used: "bg-gray-100 text-gray-600",
    expired: "bg-red-100 text-red-600",
  };

  const statusLabels: Record<ResetRequest["status"], string> = {
    pending: "Pending",
    approved: "Approved",
    used: "Used",
    expired: "Declined",
  };

  const roleStyles: Record<ResetRequest["role"], string> = {
    student: "bg-blue-100 text-blue-700",
    teacher: "bg-purple-100 text-purple-700",
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-sm transition">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-semibold text-gray-900">
            {request.full_name}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleStyles[request.role]}`}
          >
            {request.role}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[request.status]}`}
          >
            {statusLabels[request.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {request.reference_number}
          </span>
          {request.classes && request.classes.length > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {request.classes[0].name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(request.created_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {request.status === "pending" && (
          <>
            <button
              onClick={onDecline}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200
                rounded-lg hover:bg-red-50 transition"
            >
              Decline
            </button>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition"
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              }}
            >
              Approve
            </button>
          </>
        )}
        {request.status === "approved" && request.temp_password && (
          <button
            onClick={onViewPassword}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
              text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
          >
            <Eye className="w-3 h-3" />
            View Password
          </button>
        )}
        {(request.status === "used" || request.status === "expired") && (
          <span className="text-xs text-gray-400 italic">No action needed</span>
        )}
      </div>
    </div>
  );
}
