"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { TableSkeleton } from "@/components/ui/skeleton";
import { 
  Store, 
  Printer, 
  Users, 
  Check, 
  Plus,
  CreditCard,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface StaffMember {
  id: string;
  role: "OWNER" | "MANAGER" | "BILLER" | "ACCOUNTANT";
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function ShopSettingsPage() {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "PRINT" | "STAFF" | "SUBSCRIPTION">("PROFILE");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Shop Profile state
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("09");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Invoice & Print settings
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [defaultFormat, setDefaultFormat] = useState<"A4" | "THERMAL">("A4");
  const [upiId, setUpiId] = useState("");
  const [terms, setTerms] = useState("1. Goods once sold will not be taken back without original bill.\n2. Warranty as per manufacturer policy.");

  // Modals and form state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"BILLER" | "MANAGER" | "ACCOUNTANT">("BILLER");
  const [staffError, setStaffError] = useState("");

  // Subscription state
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeNotice, setUpgradeNotice] = useState("");

  // SWR queries
  const { data: profileData, mutate: mutateProfile } = useSWR<{ success: boolean; tenant: any }>("/api/tenant/profile");
  const { data: membersData, isLoading: isLoadingMembers, mutate: mutateMembers } = useSWR<{ success: boolean; members: StaffMember[] }>("/api/tenant/members");
  const { data: subData, mutate: mutateSub } = useSWR<any>("/api/billing/subscription");

  const staffList = membersData?.members || [];

  useEffect(() => {
    if (profileData?.tenant) {
      setTradeName(profileData.tenant.tradeName || "");
      setLegalName(profileData.tenant.legalName || "");
      setGstin(profileData.tenant.gstin || "");
      setStateCode(profileData.tenant.stateCode || "09");
      setPhone(profileData.tenant.phone || "");
      setEmail(profileData.tenant.email || "");
      setAddress(profileData.tenant.address || "");
      if (profileData.tenant.invoicePrefix) {
        setInvoicePrefix(profileData.tenant.invoicePrefix);
      }
    }
  }, [profileData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/tenant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeName,
          legalName,
          gstin: gstin || undefined,
          stateCode,
          phone,
          email,
          address,
        }),
      });
      await mutateProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    try {
      const res = await fetch("/api/tenant/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          role: newStaffRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      setIsAddStaffOpen(false);
      setNewStaffName("");
      setNewStaffEmail("");
      await mutateMembers();
    } catch (err: any) {
      setStaffError(err.message);
    }
  };

  const handleSimulateUpgrade = async (planCode: string) => {
    try {
      setIsUpgrading(true);
      setUpgradeNotice("");
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode, billingCycle: "MONTHLY" }),
      });

      if (res.ok) {
        setUpgradeNotice(`✓ Plan successfully updated to ${planCode}. (Simulated transaction)`);
        await mutateSub();
      }
    } catch (err) {
      console.error("Error upgrading plan:", err);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shop Settings & Workspace</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure shop GST profile, invoice printing defaults, staff roles, and commercial subscriptions
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs sm:text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600" />
          Settings saved successfully!
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 font-bold transition-colors ${
            activeTab === "PROFILE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Store className="h-4 w-4" /> Shop Profile & GSTIN
        </button>
        <button
          onClick={() => setActiveTab("PRINT")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 font-bold transition-colors ${
            activeTab === "PRINT"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Printer className="h-4 w-4" /> Invoice & Printer Layout
        </button>
        <button
          onClick={() => setActiveTab("STAFF")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 font-bold transition-colors ${
            activeTab === "STAFF"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" /> Staff & Members
        </button>
        <button
          onClick={() => setActiveTab("SUBSCRIPTION")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 font-bold transition-colors ${
            activeTab === "SUBSCRIPTION"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CreditCard className="h-4 w-4" /> Subscription & Plans
        </button>
      </div>

      {/* Tab 1: Shop Profile */}
      {activeTab === "PROFILE" && (
        <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Trade Name (Board Name)"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Legal Registered Name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="GSTIN"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Input
                label="State Code (2 Digits)"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Business Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Business Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Complete Shop Address (Printed on Invoices)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold">
              Save Changes
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Print Settings */}
      {activeTab === "PRINT" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Invoice Prefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Printer Output
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDefaultFormat("A4")}
                  className={`rounded-lg border p-2 text-xs font-bold ${
                    defaultFormat === "A4"
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  A4 Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultFormat("THERMAL")}
                  className={`rounded-lg border p-2 text-xs font-bold ${
                    defaultFormat === "THERMAL"
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  3-Inch Thermal (80mm)
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="UPI ID (Generates Dynamic QR Code on Bill)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Terms & Conditions Printed on Invoice Footer
              </label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button onClick={() => setSavedSuccess(true)} className="bg-blue-600 hover:bg-blue-700 font-bold">
              Save Print Settings
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Staff & Members */}
      {activeTab === "STAFF" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs sm:text-sm text-slate-500">
                Staff member accounts are bounded by your subscription seat quota ({staffList.length} / {subData?.limits?.maxStaffMembers || 2} seats used)
              </p>
            </div>
            <Button size="sm" onClick={() => setIsAddStaffOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" /> Add Staff Member
            </Button>
          </div>

          {isLoadingMembers && !membersData ? (
            <TableSkeleton rows={4} cols={5} />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access Privileges</TableHead>
                    <TableHead className="text-right">Joined Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((st) => (
                    <TableRow key={st.id}>
                      <TableCell className="font-semibold text-slate-800">{st.user?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{st.user?.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            st.role === "OWNER"
                              ? "info"
                              : st.role === "BILLER"
                              ? "default"
                              : "warning"
                          }
                          size="sm"
                        >
                          {st.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {st.role === "OWNER" && "Full administrative & financial control"}
                        {st.role === "BILLER" && "Counter POS billing & customer creation only"}
                        {st.role === "ACCOUNTANT" && "Ledgers, expenses & tax filings"}
                        {st.role === "MANAGER" && "Inventory stock adjustments & purchases"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400">
                        {new Date(st.createdAt).toLocaleDateString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Add Staff Modal */}
          <Dialog
            isOpen={isAddStaffOpen}
            onClose={() => setIsAddStaffOpen(false)}
            title="Add Shop Staff Member"
            description="Assign cashier or accountant role with limited counter access"
            maxWidth="md"
          >
            {staffError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 mb-4">
                {staffError}
              </div>
            )}
            <form onSubmit={handleAddStaff} className="space-y-4 text-xs sm:text-sm">
              <Input
                label="Full Name"
                required
                placeholder="Sunil Kumar"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
              />
              <Input
                label="Email Address (Login ID)"
                required
                type="email"
                placeholder="sunil@elvora.in"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="BILLER">BILLER — Fast counter billing only (Cannot delete bills)</option>
                  <option value="MANAGER">MANAGER — Stock adjustments & supplier purchases</option>
                  <option value="ACCOUNTANT">ACCOUNTANT — Financial ledgers & tax reports</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsAddStaffOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold">
                  Create Staff Account
                </Button>
              </div>
            </form>
          </Dialog>
        </div>
      )}

      {/* Tab 4: Subscription & Billing */}
      {activeTab === "SUBSCRIPTION" && (
        <div className="space-y-6">
          {upgradeNotice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              {upgradeNotice}
            </div>
          )}

          {/* Current Plan Overview Card */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">
                    {subData?.plan?.name || "Free Trial"}
                  </Badge>
                  <Badge
                    variant={
                      subData?.status === "ACTIVE"
                        ? "success"
                        : subData?.status === "TRIALING"
                        ? "warning"
                        : "danger"
                    }
                    size="sm"
                  >
                    {subData?.status}
                  </Badge>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {subData?.isTrialing
                    ? `${subData?.trialDaysRemaining} Days Left in Free Trial`
                    : subData?.plan?.name}
                </h2>
                <p className="text-xs text-slate-300 max-w-xl">
                  {subData?.plan?.description || "Explore all pro features of Elvora risk-free."}
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-extrabold text-white">
                  ₹{subData?.plan?.priceMonthly || 0}
                  <span className="text-xs font-normal text-slate-400"> / month</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Renews: {subData?.subscription?.currentPeriodEnd ? new Date(subData.subscription.currentPeriodEnd).toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
            </div>

            {/* Quota Limits Progress Grid */}
            <div className="mt-6 pt-6 border-t border-slate-800 grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <span className="text-slate-400">Monthly Invoices Quota:</span>
                <p className="text-base font-bold text-white mt-1">
                  {subData?.limits?.maxInvoicesPerMonth === -1
                    ? "Unlimited"
                    : `${subData?.limits?.maxInvoicesPerMonth || 50} / month`}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Product Variety Quota:</span>
                <p className="text-base font-bold text-white mt-1">
                  {subData?.limits?.maxProducts === -1
                    ? "Unlimited"
                    : `${subData?.limits?.maxProducts || 100} products`}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Staff Seats:</span>
                <p className="text-base font-bold text-white mt-1">
                  {subData?.limits?.maxStaffMembers || 2} members
                </p>
              </div>
            </div>
          </div>

          {/* Development Mock Provider Banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
            <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Development Mock Provider Active:</strong>
              <p className="text-amber-800 mt-0.5">
                Upgrading below tests server-side plan limit enforcement using a simulated development checkout session. No real cards are charged. In production, verified webhooks from Stripe or Razorpay activate these tiers.
              </p>
            </div>
          </div>

          {/* Available Upgrade Plans */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Starter Plan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Starter</span>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">₹499 <span className="text-xs text-slate-500 font-normal">/ mo</span></div>
                <p className="text-xs text-slate-600 mt-1">For independent retail shops and single counters.</p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <li>✓ 300 Invoices / month</li>
                  <li>✓ 500 Product Varieties</li>
                  <li>✓ 3 Staff Members</li>
                </ul>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isUpgrading || subData?.plan?.code === "STARTER"}
                onClick={() => handleSimulateUpgrade("STARTER")}
                className="w-full font-bold"
              >
                {subData?.plan?.code === "STARTER" ? "Current Tier" : "Switch to Starter"}
              </Button>
            </div>

            {/* Growth Plan */}
            <div className="rounded-2xl border-2 border-blue-600 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between relative">
              <span className="absolute -top-3 right-4 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white">
                Recommended
              </span>
              <div>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Growth Pro</span>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">₹1,499 <span className="text-xs text-slate-500 font-normal">/ mo</span></div>
                <p className="text-xs text-slate-600 mt-1">For wholesalers, high-volume counters and sanitaryware showrooms.</p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <li>✓ <strong>Unlimited Invoices</strong></li>
                  <li>✓ 5,000 Product Varieties</li>
                  <li>✓ 10 Staff Members (RBAC)</li>
                  <li>✓ Advanced GSTR-1/3B Analytics</li>
                </ul>
              </div>
              <Button
                size="sm"
                disabled={isUpgrading || subData?.plan?.code === "GROWTH"}
                onClick={() => handleSimulateUpgrade("GROWTH")}
                className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-white"
              >
                {subData?.plan?.code === "GROWTH" ? "Current Tier" : "Upgrade to Growth Pro"}
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Enterprise</span>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">₹3,999 <span className="text-xs text-slate-500 font-normal">/ mo</span></div>
                <p className="text-xs text-slate-600 mt-1">For multi-branch corporate distributors and factory depots.</p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <li>✓ Unlimited Everything</li>
                  <li>✓ 50 Staff Members</li>
                  <li>✓ Dedicated Account Manager</li>
                </ul>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isUpgrading || subData?.plan?.code === "ENTERPRISE"}
                onClick={() => handleSimulateUpgrade("ENTERPRISE")}
                className="w-full font-bold"
              >
                {subData?.plan?.code === "ENTERPRISE" ? "Current Tier" : "Switch to Enterprise"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
