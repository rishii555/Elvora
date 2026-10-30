"use client";

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { 
  Search, 
  Plus, 
  Eye,
  Users
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";

export interface CustomerUI {
  id: string;
  name: string;
  companyName?: string | null;
  phone: string;
  email?: string | null;
  gstin?: string | null;
  stateCode: string;
  address?: string | null;
  creditLimit: number;
  outstandingBalance: number;
  createdAt: string;
}

export default function UniversalCustomersPage() {
  const { data, isLoading, mutate } = useSWR("/api/customers");
  const customers: CustomerUI[] = data?.customers || [];
  const totalOutstanding: number = data?.totalOutstanding || 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUI | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    gstin: "",
    stateCode: "09",
    address: "",
    creditLimit: "100000",
    openingBalance: "0",
  });

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCreditParties = customers.filter((c) => c.outstandingBalance > 0).length;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomer.name,
          companyName: newCustomer.companyName || undefined,
          phone: newCustomer.phone,
          email: newCustomer.email || undefined,
          gstin: newCustomer.gstin ? newCustomer.gstin.toUpperCase() : undefined,
          stateCode: newCustomer.stateCode,
          address: newCustomer.address || undefined,
          creditLimit: Number(newCustomer.creditLimit) || 0,
          openingBalance: Number(newCustomer.openingBalance) || 0,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        // Optimistically mutate local cache immediately
        mutate();
        setNewCustomer({
          name: "",
          companyName: "",
          phone: "",
          email: "",
          gstin: "",
          stateCode: "09",
          address: "",
          creditLimit: "100000",
          openingBalance: "0",
        });
      } else {
        setErrorMessage(data.error || "Failed to create customer");
      }
    } catch {
      setErrorMessage("Network error creating customer profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients & Customers</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Client directories, corporate credit accounts (Khata), and receivables management
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 font-bold">
          <Plus className="h-4 w-4 mr-1" /> Add Client Account
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Client Directory</span>
          <p className="mt-2 text-xl font-bold text-slate-900">{customers.length} accounts</p>
          <span className="text-xs text-slate-400">Corporate, wholesale & retail buyers</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Pending Receivables</span>
          <p className="mt-2 text-xl font-bold text-rose-600">{formatINR(totalOutstanding)}</p>
          <span className="text-xs text-slate-400">Outstanding on credit terms</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Credit Accounts</span>
          <p className="mt-2 text-xl font-bold text-slate-900">{activeCreditParties} parties</p>
          <span className="text-xs text-slate-400">Awaiting payment settlement</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by client name, company, phone, or GSTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Customer Directory Table */}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client / Entity</TableHead>
              <TableHead>Phone / Location</TableHead>
              <TableHead>Type / GSTIN</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead>
              <TableHead className="text-right">Outstanding Due</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <TableSkeleton rows={4} cols={6} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No Customers Found</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchTerm ? "No customers match your search criteria." : "You haven't added any customer accounts yet."}
                    </p>
                    {!searchTerm && (
                      <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Your First Client
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.companyName || "Direct Individual"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium text-slate-700">{c.phone}</p>
                    <span className="text-[11px] text-slate-400">{c.address || `State Code: ${c.stateCode}`}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.gstin ? "info" : "default"} size="sm">
                      {c.gstin ? "B2B GST" : "Retail / B2C"}
                    </Badge>
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {c.gstin || "Unregistered"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-slate-500">
                    {formatINR(c.creditLimit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.outstandingBalance > 0 ? (
                      <span className="font-bold text-rose-600">{formatINR(c.outstandingBalance)}</span>
                    ) : (
                      <Badge variant="success" size="sm">Cleared</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCustomer(c)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Ledger
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Customer Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Client or Corporate Account"
        description="Configure billing details, tax ID, and approved credit limit"
        maxWidth="lg"
      >
        <form onSubmit={handleAddCustomer} className="space-y-4 text-xs sm:text-sm">
          {errorMessage && (
            <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600 border border-rose-200">
              {errorMessage}
            </div>
          )}

          <Input
            label="Client Contact / Person Name"
            required
            placeholder="e.g. Vikram Malhotra"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
          />
          <Input
            label="Company / Firm Name (Optional)"
            placeholder="e.g. Apex Infotech Solutions Pvt Ltd"
            value={newCustomer.companyName}
            onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Phone"
              required
              type="tel"
              placeholder="9876543210"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="billing@client.com"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="GSTIN / Tax ID"
              placeholder="09ABCDE1234F1Z5"
              value={newCustomer.gstin}
              onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value.toUpperCase() })}
            />
            <Input
              label="Approved Credit Limit (₹)"
              type="number"
              placeholder="100000"
              value={newCustomer.creditLimit}
              onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: e.target.value })}
            />
          </div>
          <Input
            label="Billing Address / City"
            placeholder="Sector 62, Noida, Uttar Pradesh"
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Client Profile"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Client Ledger Dialog */}
      {selectedCustomer && (
        <Dialog
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Client Ledger: ${selectedCustomer.name}`}
          description={`Entity: ${selectedCustomer.companyName || "Direct Account"} • Total Due: ${formatINR(selectedCustomer.outstandingBalance)}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500">Current Outstanding Receivable:</p>
                <p className="text-2xl font-bold text-rose-600">{formatINR(selectedCustomer.outstandingBalance)}</p>
              </div>
              <div>
                <Link href="/payments">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    Record Payment
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-1 text-xs">
              <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
              {selectedCustomer.email && <p><strong>Email:</strong> {selectedCustomer.email}</p>}
              {selectedCustomer.gstin && <p><strong>GSTIN:</strong> {selectedCustomer.gstin}</p>}
              {selectedCustomer.address && <p><strong>Address:</strong> {selectedCustomer.address}</p>}
              <p><strong>Credit Limit:</strong> {formatINR(selectedCustomer.creditLimit)}</p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
