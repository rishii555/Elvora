"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  LogOut, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Mail
} from "lucide-react";
import { ElvoraLogo } from "@/components/logo";

function PendingApprovalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email] = useState<string>(searchParams.get("email") || "");
  const [businessName, setBusinessName] = useState<string>(searchParams.get("name") || "");
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED">("PENDING");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkStatus = React.useCallback(async () => {
    if (!email) return;
    setIsChecking(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/auth/status?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(data.status);
        if (data.businessName) setBusinessName(data.businessName);
        if (data.rejectionReason) setRejectionReason(data.rejectionReason);
        setLastChecked(new Date());
      } else {
        setErrorMsg(data.error || "Unable to check status at this time.");
      }
    } catch {
      setErrorMsg("Network error checking approval status.");
    } finally {
      setIsChecking(false);
    }
  }, [email]);

  useEffect(() => {
    if (email) {
      checkStatus();
    }
  }, [email, checkStatus]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center">
            <ElvoraLogo size="lg" showTagline />
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Status Badge & Icon */}
          {status === "PENDING" && (
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
                <Clock className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-xs font-bold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                  Under Review
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                  Account Registration Received!
                </h1>
                <p className="text-xs sm:text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
                  Your business account has been created successfully and is currently under review by the Elvora administration team.
                </p>
              </div>
            </div>
          )}

          {status === "APPROVED" && (
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-700">
                  Approved
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                  Congratulations! Your Account is Approved
                </h1>
                <p className="text-xs sm:text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
                  The Elvora administration team has verified and approved your business workspace. You can now access your dashboard.
                </p>
              </div>
            </div>
          )}

          {status === "REJECTED" && (
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-2xs">
                <XCircle className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-0.5 text-xs font-bold text-rose-700">
                  Registration Not Approved
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                  Account Verification Update
                </h1>
                <p className="text-xs sm:text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
                  Your registration request could not be approved at this time.
                </p>
                {rejectionReason && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800 text-left">
                    <span className="font-bold">Reason provided:</span> {rejectionReason}
                  </div>
                )}
              </div>
            </div>
          )}

          {status === "SUSPENDED" && (
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center mx-auto shadow-2xs">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-3 py-0.5 text-xs font-bold text-slate-700">
                  Account Suspended
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                  Workspace Temporarily Locked
                </h1>
                <p className="text-xs sm:text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
                  Access to this business workspace has been suspended by the platform administrator.
                </p>
              </div>
            </div>
          )}

          {/* Submitted Information Box */}
          <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/70 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Registered Email:
              </span>
              <span className="font-bold text-[#111827]">{email || "—"}</span>
            </div>
            {businessName && (
              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Business Name:
                </span>
                <span className="font-bold text-[#111827]">{businessName}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-200/60 text-[11px]">
              <span>Last checked:</span>
              <span>{lastChecked.toLocaleTimeString("en-IN")}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Action Triggers */}
          <div className="space-y-3 pt-2">
            {status === "APPROVED" ? (
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1D4ED8] transition"
              >
                Continue to Store Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={checkStatus}
                disabled={isChecking}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1D4ED8] disabled:opacity-50 transition cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Checking Status..." : "Check Approval Status"}
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#111827] hover:bg-slate-50 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out & Back to Login
            </button>
          </div>

          {/* Security & Privacy Notice */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-[#64748B]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Multi-tenant data vault security. Only authorized users receive workspace access.</span>
          </div>
        </div>

        {/* Support Help Link */}
        <p className="text-center text-xs text-slate-500">
          Need urgent assistance with your registration?{" "}
          <Link href="/contact" className="text-blue-600 font-semibold hover:underline">
            Contact Elvora Support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500">Loading registration status...</p>
        </div>
      </div>
    }>
      <PendingApprovalContent />
    </Suspense>
  );
}
