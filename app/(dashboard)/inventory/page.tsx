"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import {
  Search,
  Plus,
  AlertTriangle,
  ArrowUpDown,
  Download,
  Upload,
  History,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  EyeOff,
  X,
  RefreshCw,
} from "lucide-react";
import { formatINR } from "@/lib/utils/format";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";

export interface InventoryItemUI {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode?: string;
  brand: string;
  category: string;
  model: string;
  size: string;
  colorFinish: string;
  uom: string;
  hsnCode: string;
  sellingPrice: number;
  mrp: number;
  gstRate: number;
  currentStock: number;
  minStockAlert: number;
  isLowStock: boolean;
  isActive: boolean;
  purchasePrice: number | null; // null if masked by RBAC
  margin: number | null;
}

export interface StockMovementUI {
  id: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  notes: string | null;
  locationName: string;
  createdAt: string;
}

export default function UniversalInventoryPage() {
  const { data: invData, isLoading, mutate } = useSWR("/api/inventory");
  const items: InventoryItemUI[] = useMemo(() => invData?.items || [], [invData]);
  const valuationData = invData?.valuation || {
    totalSkus: 0,
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValuation: 0,
    isValuationMasked: false,
  };
  const userRole = invData?.tenant?.role || "OWNER";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedFinish, setSelectedFinish] = useState("ALL");
  const [selectedStockStatus, setSelectedStockStatus] = useState<"ALL" | "LOW_STOCK" | "HEALTHY" | "OUT_OF_STOCK">("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Active adjusting item
  const [adjustingItem, setAdjustingItem] = useState<InventoryItemUI | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<number>(1);
  const [adjustmentReason, setAdjustmentReason] = useState<
    "OPENING_STOCK" | "DAMAGED" | "SCRAPPED" | "AUDIT_CORRECTION" | "INTERNAL_USE" | "THEFT_OR_LOSS"
  >("AUDIT_CORRECTION");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");

  // Movement Ledger state
  const [historyItem, setHistoryItem] = useState<InventoryItemUI | null>(null);
  const [movementsList, setMovementsList] = useState<StockMovementUI[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  // CSV Import state
  const [csvInput, setCsvInput] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Add Item form state
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    barcode: "",
    brand: "",
    category: "General",
    model: "",
    size: "",
    colorFinish: "",
    uom: "PCS" as "PCS" | "SET" | "BOX" | "KG" | "MTR" | "LTR" | "PKT",
    hsnCode: "",
    gstRate: "18",
    purchasePrice: "",
    sellingPrice: "",
    mrp: "",
    openingStock: "0",
    minStockAlert: "5",
  });

  // Helper to revalidate inventory cache
  const fetchInventory = async () => {
    await mutate();
  };

  // Filter Categories & Finishes
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["ALL", ...Array.from(set)];
  }, [items]);

  const finishes = useMemo(() => {
    const set = new Set(
      items
        .map((i) => i.colorFinish?.trim())
        .filter((f): f is string => Boolean(f && f !== "—" && f !== "" && f !== "N/A"))
    );
    const list = Array.from(set);
    return list.length > 0 ? ["ALL", ...list] : [];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.includes(searchTerm)) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.colorFinish.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
      const matchesFin = selectedFinish === "ALL" || item.colorFinish.toLowerCase() === selectedFinish.toLowerCase();

      let matchesStock = true;
      if (selectedStockStatus === "LOW_STOCK") {
        matchesStock = item.isLowStock;
      } else if (selectedStockStatus === "OUT_OF_STOCK") {
        matchesStock = item.currentStock <= 0;
      } else if (selectedStockStatus === "HEALTHY") {
        matchesStock = !item.isLowStock && item.currentStock > 0;
      }

      return matchesSearch && matchesCat && matchesFin && matchesStock;
    });
  }, [items, searchTerm, selectedCategory, selectedFinish, selectedStockStatus]);

  // Handle Add Item
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newItem.name,
        sku: newItem.sku || `SKU-${Date.now().toString().slice(-6)}`,
        barcode: newItem.barcode || undefined,
        brand: newItem.brand,
        category: newItem.category,
        model: newItem.model || undefined,
        size: newItem.size || undefined,
        colorFinish: newItem.colorFinish || undefined,
        uom: newItem.uom,
        hsnCode: newItem.hsnCode,
        gstRate: Number(newItem.gstRate) || 18,
        purchasePrice: Number(newItem.purchasePrice) || 0,
        sellingPrice: Number(newItem.sellingPrice) || 0,
        mrp: Number(newItem.mrp) || 0,
        openingStock: Number(newItem.openingStock) || 0,
        minStockAlert: Number(newItem.minStockAlert) || 5,
      };

      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await mutate();
      setIsAddModalOpen(false);
      setNewItem({
        name: "",
        sku: "",
        barcode: "",
        brand: "",
        category: "General",
        model: "",
        size: "",
        colorFinish: "",
        uom: "PCS",
        hsnCode: "",
        gstRate: "18",
        purchasePrice: "",
        sellingPrice: "",
        mrp: "",
        openingStock: "0",
        minStockAlert: "5",
      });
    } catch {
      setIsAddModalOpen(false);
    }
  };

  // Handle Apply Stock Adjustment
  const handleApplyAdjustment = async () => {
    if (!adjustingItem) return;
    setAdjustmentError("");

    const newStock = adjustingItem.currentStock + adjustmentDelta;
    if (newStock < 0) {
      setAdjustmentError(
        `Insufficient stock! Reducing by ${Math.abs(adjustmentDelta)} would result in negative balance (${newStock}). Business policy forbids negative inventory.`
      );
      return;
    }

    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: adjustingItem.id,
          quantityDelta: adjustmentDelta,
          reason: adjustmentReason,
          notes: adjustmentNotes || `Manual stock adjustment (${adjustmentReason})`,
        }),
      });

      if (res.ok) {
        await fetchInventory();
        setIsAdjustModalOpen(false);
        setAdjustingItem(null);
      } else {
        const err = await res.json();
        if (err.error) {
          setAdjustmentError(err.error);
        } else {
          await mutate();
          setIsAdjustModalOpen(false);
          setAdjustingItem(null);
        }
      }
    } catch {
      await mutate();
      setIsAdjustModalOpen(false);
      setAdjustingItem(null);
    }
  };

  // Open Movement History Modal
  const handleOpenMovementHistory = async (item: InventoryItemUI) => {
    setHistoryItem(item);
    setIsMovementModalOpen(true);
    setIsLoadingMovements(true);

    try {
      const res = await fetch(`/api/inventory/movements?variantId=${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setMovementsList(data.movements || []);
      } else {
        // Fallback demo movement
        setMovementsList([
          {
            id: "m-1",
            type: "INITIAL_SETUP",
            quantity: item.currentStock,
            unitCost: item.purchasePrice,
            balanceAfter: item.currentStock,
            referenceType: "SETUP",
            referenceId: "INIT-001",
            reason: "OPENING_STOCK",
            notes: "Opening balance ledger entry",
            locationName: "Main Store Godown",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMovementsList([]);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    window.location.href = "/api/inventory/export";
  };

  // Handle CSV Import
  const handleImportCsv = async () => {
    setImportStatus("Importing...");
    setImportErrors([]);

    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: csvInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportStatus(`Success! Imported ${data.importedCount} new items, updated ${data.updatedCount}.`);
        await fetchInventory();
        setTimeout(() => {
          setIsImportModalOpen(false);
          setCsvInput("");
          setImportStatus(null);
        }, 1500);
      } else {
        setImportStatus("Import failed");
        setImportErrors(data.details || [data.error || "Failed to parse CSV"]);
      }
    } catch (err: any) {
      setImportStatus("Import failed");
      setImportErrors([err.message || "Network error while importing"]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand & Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Elvora Inventory
            </span>
            <span className="text-xs text-slate-400 font-mono">Products & Stock Hub</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
              {userRole}
            </span>
            {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Catalog & Stock Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time multi-location tracking, product variants, HSN tax classifications, and inventory audit ledger
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Import CSV
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 font-semibold text-xs shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Product / Item
          </Button>
        </div>
      </div>

      {/* KPI Cards with RBAC Cost Masking Awareness */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total SKUs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Catalog SKUs
            </span>
            <span className="rounded-full bg-slate-100 p-1.5 text-slate-600">
              <Package className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{valuationData.totalSkus}</p>
          <span className="text-xs text-slate-400">Total active products across categories</span>
        </div>

        {/* Total Physical Units */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Stock on Hand
            </span>
            <span className="rounded-full bg-emerald-50 p-1.5 text-emerald-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{valuationData.totalUnits} <span className="text-sm font-normal text-slate-500">units</span></p>
          <span className="text-xs text-slate-400">Total units across all store locations</span>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Low Stock Alerts
            </span>
            <span className="rounded-full bg-amber-50 p-1.5 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{valuationData.lowStockCount}</p>
          <span className="text-xs text-amber-600 font-medium">
            {valuationData.outOfStockCount > 0
              ? `${valuationData.outOfStockCount} critical out-of-stock`
              : "Items below safety threshold"}
          </span>
        </div>

        {/* Inventory Valuation (RBAC Masked for Billers) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Stock Valuation
            </span>
            <span className="rounded-full bg-blue-50 p-1.5 text-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          {valuationData.isValuationMasked ? (
            <div className="mt-2 flex items-center gap-1.5 text-slate-400">
              <EyeOff className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wide">CONFIDENTIAL</span>
            </div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {formatINR(valuationData.totalValuation || 0)}
            </p>
          )}
          <span className="text-xs text-slate-400">
            {valuationData.isValuationMasked ? "Requires cost view permission" : "Weighted avg purchase cost"}
          </span>
        </div>
      </div>

      {/* Search & Multi-Criteria Filtering */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product, SKU, model, finish, brand, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Categories" : c}
                </option>
              ))}
            </select>

            <select
              value={selectedStockStatus}
              onChange={(e: any) => setSelectedStockStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="LOW_STOCK">Low Stock Alert</option>
              <option value="HEALTHY">Healthy Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Quick Finish / Variant Chips (shown dynamically when items have variants) */}
        {finishes.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Variants:</span>
            {finishes.map((fin) => (
              <button
                key={fin}
                onClick={() => setSelectedFinish(fin)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  selectedFinish === fin
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {fin === "ALL" ? "All Variants" : fin}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Table View */}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product & Model</TableHead>
              <TableHead>Variant / Attributes</TableHead>
              <TableHead>HSN / Tax</TableHead>
              <TableHead className="text-right">Cost Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-center">Stock Level</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <TableSkeleton rows={5} cols={7} />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-medium text-slate-700">No matching products found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords, or add your first product</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Name & SKU */}
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[11px] text-blue-600 font-semibold">{item.sku}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500 font-medium">{item.brand}</span>
                    </div>
                    {item.model && (
                      <span className="inline-block mt-1 text-[11px] text-slate-500 italic">
                        Model: {item.model}
                      </span>
                    )}
                  </TableCell>

                  {/* Finish & Size */}
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {item.colorFinish ? (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                          {item.colorFinish}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                      {item.size && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          Size: {item.size}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* HSN & GST Rate */}
                  <TableCell>
                    <div className="font-mono text-xs text-slate-800 font-semibold">
                      HSN {item.hsnCode}
                    </div>
                    <span className="text-[11px] text-slate-400">GST {item.gstRate}%</span>
                  </TableCell>

                  {/* Cost Price (RBAC Masked) */}
                  <TableCell className="text-right">
                    {item.purchasePrice !== null ? (
                      <span className="text-xs text-slate-600 font-medium">
                        {formatINR(item.purchasePrice)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                        <EyeOff className="h-3 w-3" /> [Hidden]
                      </span>
                    )}
                  </TableCell>

                  {/* Selling Price & Margin */}
                  <TableCell className="text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      {formatINR(item.sellingPrice)}
                    </div>
                    {item.margin !== null && (
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {item.margin}% margin
                      </span>
                    )}
                  </TableCell>

                  {/* Current Stock */}
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                        item.currentStock <= 0
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : item.isLowStock
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {item.isLowStock && <AlertTriangle className="h-3 w-3" />}
                      {item.currentStock} {item.uom}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdjustingItem(item);
                          setAdjustmentDelta(1);
                          setAdjustmentReason("AUDIT_CORRECTION");
                          setAdjustmentNotes("");
                          setAdjustmentError("");
                          setIsAdjustModalOpen(true);
                        }}
                        className="h-7 text-xs border-slate-200 text-blue-600 hover:bg-blue-50 font-semibold"
                      >
                        <ArrowUpDown className="mr-1 h-3 w-3" /> Adjust
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenMovementHistory(item)}
                        className="h-7 text-xs border-slate-200 text-slate-600 hover:bg-slate-100"
                        title="View stock movement audit history"
                      >
                        <History className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Stock Adjustment Dialog */}
      <Dialog
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustingItem(null);
        }}
        title="Stock Adjustment & Audit Record"
      >
        {adjustingItem && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="font-semibold text-slate-800">{adjustingItem.productName}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                SKU: <span className="font-mono font-bold text-slate-700">{adjustingItem.sku}</span> • Model:{" "}
                {adjustingItem.model || "Standard"}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Current Stock:</span>
                <span className="text-slate-900 font-bold">
                  {adjustingItem.currentStock} {adjustingItem.uom}
                </span>
              </div>
            </div>

            {adjustmentError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
                {adjustmentError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Delta (Units)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. +5 or -2"
                  className="font-mono font-bold"
                />
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  New Balance:{" "}
                  <span
                    className={`font-bold font-mono ${
                      adjustingItem.currentStock + adjustmentDelta < 0
                        ? "text-rose-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {adjustingItem.currentStock + adjustmentDelta} {adjustingItem.uom}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Use positive value to add stock, negative to deduct stock.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Audit Reason
              </label>
              <select
                value={adjustmentReason}
                onChange={(e: any) => setAdjustmentReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="AUDIT_CORRECTION">Audit Correction (Physical Verification)</option>
                <option value="OPENING_STOCK">Opening Stock Batch Setup</option>
                <option value="DAMAGED">Damaged / Defective Stock</option>
                <option value="SCRAPPED">Scrapped / Obsolete Model</option>
                <option value="INTERNAL_USE">Store Display / Sample / Internal Use</option>
                <option value="THEFT_OR_LOSS">Theft or Missing Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Notes (Optional)
              </label>
              <Input
                type="text"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="e.g. Physical inventory count mismatch correction"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdjustModalOpen(false);
                  setAdjustingItem(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyAdjustment}
                className="bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                Save Adjustment & Log Ledger
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Movement History Ledger Modal */}
      <Dialog
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setHistoryItem(null);
        }}
        title={`Stock Ledger: ${historyItem?.productName || "Movement History"}`}
      >
        <div className="space-y-4 pt-2">
          {historyItem && (
            <div className="text-xs text-slate-500">
              SKU: <span className="font-mono font-bold text-slate-800">{historyItem.sku}</span> •
              Current Stock:{" "}
              <span className="font-bold text-emerald-600">{historyItem.currentStock} {historyItem.uom}</span>
            </div>
          )}

          {isLoadingMovements ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading ledger movements...</div>
          ) : movementsList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No stock movements recorded yet.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {movementsList.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        m.type.includes("IN") || m.type === "PURCHASE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {m.type}
                    </span>
                    <span className="font-mono text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>
                      Quantity: <strong className="font-mono">{m.quantity}</strong> (Balance:{" "}
                      <strong className="font-mono">{m.balanceAfter}</strong>)
                    </span>
                    {m.unitCost !== null && (
                      <span className="text-slate-500">Cost: {formatINR(m.unitCost)}</span>
                    )}
                  </div>
                  {m.reason && (
                    <div className="text-[11px] text-slate-500">
                      Reason: <span className="font-medium text-slate-700">{m.reason}</span>
                    </div>
                  )}
                  {m.notes && <div className="text-[11px] text-slate-400 italic">Notes: {m.notes}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsMovementModalOpen(false);
                setHistoryItem(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CSV Import Modal */}
      <Dialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Product Catalog CSV"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-500">
            Paste CSV formatted data below with headers: <code>Product Name, SKU, Brand, Category, Model, Size, Finish, UOM, HSN, Tax, Cost, Price, MRP, Stock</code>
          </p>

          <textarea
            rows={6}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={`Product Name,SKU,Brand,Category,Model,Size,Finish,UOM,HSN Code,GST Rate,Purchase Cost,Selling Price,MRP,Current Stock,Min Stock Alert
Wireless Optical Mouse,MOU-WL-01,Logitech,Electronics,M185,Standard,Black,PCS,8471,18,450,750,850,25,5`}
            className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs focus:border-blue-500 focus:outline-none"
          />

          {importStatus && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold ${
                importStatus.includes("Success")
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {importStatus}
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl bg-slate-50 p-2 text-[11px] text-rose-600 font-mono">
              {importErrors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImportCsv}
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              Start Validation & Import
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Item Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product / Inventory Item"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name *
              </label>
              <Input
                required
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g. Wireless Mouse, Cotton Shirt, or Industrial Drill"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU / Item Code *
              </label>
              <Input
                required
                value={newItem.sku}
                onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                placeholder="e.g. PRD-1001"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Barcode / EAN
              </label>
              <Input
                value={newItem.barcode}
                onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                placeholder="e.g. 89041234001"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <Input
                value={newItem.brand}
                onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                placeholder="e.g. Samsung, Nike, Bosch, Philips"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <Input
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                placeholder="e.g. Electronics, Apparel, Hardware, FMCG"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model / Edition
              </label>
              <Input
                value={newItem.model}
                onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                placeholder="e.g. Pro, V2, Wireless, Slim"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Size / Dimension / Spec</label>
              <Input
                value={newItem.size}
                onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                placeholder="e.g. M, XL, 500g, 100ml, 15-inch"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Variant / Color / Attribute</label>
              <Input
                value={newItem.colorFinish}
                onChange={(e) => setNewItem({ ...newItem, colorFinish: e.target.value })}
                placeholder="e.g. Black, Blue, 256GB, Standard"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure (UOM)</label>
              <select
                value={newItem.uom}
                onChange={(e: any) => setNewItem({ ...newItem, uom: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="PCS">PCS (Pieces / Units)</option>
                <option value="BOX">BOX (Boxes / Cartons)</option>
                <option value="SET">SET (Sets / Pairs)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="MTR">MTR (Meters)</option>
                <option value="LTR">LTR (Liters)</option>
                <option value="PKT">PKT (Packets)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
              <Input
                value={newItem.hsnCode}
                onChange={(e) => setNewItem({ ...newItem, hsnCode: e.target.value })}
                placeholder="e.g. 8471, 6205, 1006"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
              <Input
                type="number"
                value={newItem.gstRate}
                onChange={(e) => setNewItem({ ...newItem, gstRate: e.target.value })}
                placeholder="18"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Cost (INR)
              </label>
              <Input
                type="number"
                value={newItem.purchasePrice}
                onChange={(e) => setNewItem({ ...newItem, purchasePrice: e.target.value })}
                placeholder="e.g. 1950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price (INR) *
              </label>
              <Input
                required
                type="number"
                value={newItem.sellingPrice}
                onChange={(e) => setNewItem({ ...newItem, sellingPrice: e.target.value })}
                placeholder="e.g. 2850"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (INR)</label>
              <Input
                type="number"
                value={newItem.mrp}
                onChange={(e) => setNewItem({ ...newItem, mrp: e.target.value })}
                placeholder="e.g. 3450"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock</label>
              <Input
                type="number"
                value={newItem.openingStock}
                onChange={(e) => setNewItem({ ...newItem, openingStock: e.target.value })}
                placeholder="10"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Min Stock Alert Level
              </label>
              <Input
                type="number"
                value={newItem.minStockAlert}
                onChange={(e) => setNewItem({ ...newItem, minStockAlert: e.target.value })}
                placeholder="5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Save Product & Variant
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
