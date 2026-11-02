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
  ShieldCheck,
  EyeOff,
  X,
  RefreshCw,
  Building2,
  ArrowRightLeft,
  BookmarkCheck,
  CheckCircle2,
  Edit3,
  Archive,
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
  physicalStock?: number;
  reservedStock?: number;
  availableStock?: number;
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
  const [activeTab, setActiveTab] = useState<"catalog" | "warehouses" | "transfers" | "low-stock" | "reservations">("catalog");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");

  // Main inventory query (supports warehouse filter)
  const invUrl = selectedLocation === "ALL" ? "/api/inventory" : `/api/inventory?locationId=${selectedLocation}`;
  const { data: invData, isLoading, mutate } = useSWR(invUrl);
  const { data: locationsData, mutate: mutateLocations } = useSWR("/api/inventory/locations");
  const { data: transfersData, mutate: mutateTransfers } = useSWR("/api/inventory/transfers");
  const { data: lowStockData, mutate: mutateLowStock } = useSWR(
    selectedLocation === "ALL" ? "/api/inventory/low-stock" : `/api/inventory/low-stock?locationId=${selectedLocation}`
  );
  const { data: reservationsData, mutate: mutateReservations } = useSWR("/api/inventory/reservations");

  const items: InventoryItemUI[] = useMemo(() => invData?.items || [], [invData]);
  const valuationData = invData?.valuation || {
    totalSkus: 0,
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValuation: 0,
    isValuationMasked: false,
  };
  const locationsList = useMemo(() => locationsData?.locations || [], [locationsData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedFinish, setSelectedFinish] = useState("ALL");
  const [selectedStockStatus, setSelectedStockStatus] = useState<"ALL" | "LOW_STOCK" | "HEALTHY" | "OUT_OF_STOCK">("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [isEditWarehouseOpen, setIsEditWarehouseOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);

  // Active adjusting item
  const [adjustingItem, setAdjustingItem] = useState<InventoryItemUI | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<number>(1);
  const [adjustmentLocationId, setAdjustmentLocationId] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<
    "OPENING_STOCK" | "DAMAGED" | "SCRAPPED" | "AUDIT_CORRECTION" | "INTERNAL_USE" | "THEFT_OR_LOSS"
  >("AUDIT_CORRECTION");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");

  // Warehouse CRUD state
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: "", code: "", address: "", isDefault: false });
  const [warehouseError, setWarehouseError] = useState("");

  // Transfer state
  const [transferForm, setTransferForm] = useState({
    sourceLocationId: "",
    destinationLocationId: "",
    variantId: "",
    quantity: 1,
    notes: "",
  });
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");

  // Reservation Form state
  const [reserveForm, setReserveForm] = useState({
    variantId: "",
    locationId: "",
    quantity: 1,
    referenceType: "MANUAL",
    referenceId: `RES-${Date.now().toString().slice(-6)}`,
    notes: "",
  });
  const [reserveError, setReserveError] = useState("");

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
    uom: "PCS" as "PCS" | "SET" | "PAIR" | "BOX" | "KG" | "MTR",
    material: "",
    mountingType: "",
    warrantyDuration: "",
    hsnCode: "",
    gstRate: "18",
    purchasePrice: "",
    sellingPrice: "",
    mrp: "",
    openingStock: "0",
    minStockAlert: "5",
  });

  const fetchInventory = async () => {
    await Promise.all([mutate(), mutateLocations(), mutateLowStock(), mutateTransfers(), mutateReservations()]);
  };

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
        item.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
      const matchesFinish = selectedFinish === "ALL" || item.colorFinish === selectedFinish;
      let matchesStock = true;
      if (selectedStockStatus === "LOW_STOCK") matchesStock = item.isLowStock;
      else if (selectedStockStatus === "OUT_OF_STOCK") matchesStock = (item.availableStock ?? item.currentStock) <= 0;
      else if (selectedStockStatus === "HEALTHY") matchesStock = (item.availableStock ?? item.currentStock) > 10;
      return matchesSearch && matchesCategory && matchesFinish && matchesStock;
    });
  }, [items, searchTerm, selectedCategory, selectedFinish, selectedStockStatus]);

  // Handle CSV Import
  const handleImportCsv = async () => {
    if (!csvInput.trim()) return;
    setImportStatus("Importing CSV...");
    setImportErrors([]);

    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportStatus(`Successfully imported ${data.totalImported} items!`);
        await fetchInventory();
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportStatus(null);
          setCsvInput("");
        }, 1500);
      } else {
        setImportStatus("Import failed");
        setImportErrors(data.errors || [data.error || "Unknown validation error"]);
      }
    } catch {
      setImportStatus("Import failed");
      setImportErrors(["Network or server error occurred during CSV parsing."]);
    }
  };

  // Handle Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newItem,
          purchasePrice: Number(newItem.purchasePrice) || 0,
          sellingPrice: Number(newItem.sellingPrice) || 0,
          mrp: Number(newItem.mrp) || 0,
          openingStock: Number(newItem.openingStock) || 0,
          gstRate: Number(newItem.gstRate) || 18,
          minStockAlert: Number(newItem.minStockAlert) || 5,
        }),
      });

      if (res.ok) {
        await fetchInventory();
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
          material: "",
          mountingType: "",
          warrantyDuration: "",
          hsnCode: "",
          gstRate: "18",
          purchasePrice: "",
          sellingPrice: "",
          mrp: "",
          openingStock: "0",
          minStockAlert: "5",
        });
      }
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
          locationId: adjustmentLocationId || undefined,
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
        setAdjustmentError(err.error || "Failed to adjust stock");
      }
    } catch {
      setAdjustmentError("Failed to apply stock adjustment");
    }
  };

  // Handle Create Warehouse
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarehouseError("");
    try {
      const res = await fetch("/api/inventory/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchInventory();
        setIsAddWarehouseOpen(false);
        setWarehouseForm({ name: "", code: "", address: "", isDefault: false });
      } else {
        setWarehouseError(data.error || "Failed to create location");
      }
    } catch {
      setWarehouseError("Failed to create location");
    }
  };

  // Handle Update Warehouse
  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    setWarehouseError("");
    try {
      const res = await fetch(`/api/inventory/locations/${editingWarehouse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchInventory();
        setIsEditWarehouseOpen(false);
        setEditingWarehouse(null);
      } else {
        setWarehouseError(data.error || "Failed to update location");
      }
    } catch {
      setWarehouseError("Failed to update location");
    }
  };

  // Handle Archive Warehouse (with non-zero stock guard)
  const handleArchiveWarehouse = async (loc: any) => {
    if (!confirm(`Are you sure you want to archive warehouse '${loc.name}'?`)) return;
    try {
      const res = await fetch(`/api/inventory/locations/${loc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        await fetchInventory();
      } else {
        alert(data.error || "Failed to archive location. Please transfer or adjust remaining stock first.");
      }
    } catch {
      alert("Error archiving warehouse location.");
    }
  };

  // Handle Stock Transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError("");
    setTransferSuccess("");

    if (transferForm.sourceLocationId === transferForm.destinationLocationId) {
      setTransferError("Source and destination warehouses cannot be the same");
      return;
    }

    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocationId: transferForm.sourceLocationId,
          destinationLocationId: transferForm.destinationLocationId,
          items: [{ variantId: transferForm.variantId, quantity: Number(transferForm.quantity) }],
          notes: transferForm.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTransferSuccess("Transfer completed successfully!");
        await fetchInventory();
        setTimeout(() => {
          setIsTransferModalOpen(false);
          setTransferSuccess("");
          setTransferForm({
            sourceLocationId: "",
            destinationLocationId: "",
            variantId: "",
            quantity: 1,
            notes: "",
          });
        }, 1200);
      } else {
        setTransferError(data.error || "Transfer failed");
      }
    } catch {
      setTransferError("Network error executing transfer");
    }
  };

  // Handle Create Reservation
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setReserveError("");
    try {
      const res = await fetch("/api/inventory/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reserveForm,
          quantity: Number(reserveForm.quantity),
          locationId: reserveForm.locationId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchInventory();
        setIsReserveModalOpen(false);
        setReserveForm({
          variantId: "",
          locationId: "",
          quantity: 1,
          referenceType: "MANUAL",
          referenceId: `RES-${Date.now().toString().slice(-6)}`,
          notes: "",
        });
      } else {
        setReserveError(data.error || "Failed to reserve stock");
      }
    } catch {
      setReserveError("Network error creating reservation");
    }
  };

  // Handle Release Reservation
  const handleReleaseReservation = async (resId: string) => {
    if (!confirm("Release this stock reservation back to available inventory?")) return;
    try {
      const res = await fetch(`/api/inventory/reservations/${resId}/release`, { method: "POST" });
      if (res.ok) {
        await fetchInventory();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to release reservation");
      }
    } catch {
      alert("Error releasing reservation");
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
        setMovementsList([]);
      }
    } catch {
      setMovementsList([]);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand & Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Catalog & Stock Management
            </h1>
            {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Real-time multi-location tracking, stock transfers, reservations, HSN tax classifications, and audit ledger
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> Transfer Stock
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReserveModalOpen(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            <BookmarkCheck className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Reserve Stock
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/api/inventory/export")}
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "catalog"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="h-4 w-4" /> Catalog & Stock
        </button>

        <button
          onClick={() => setActiveTab("warehouses")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "warehouses"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="h-4 w-4" /> Warehouses ({locationsList.length})
        </button>

        <button
          onClick={() => setActiveTab("transfers")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "transfers"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" /> Transfers ({transfersData?.totalCount || 0})
        </button>

        <button
          onClick={() => setActiveTab("low-stock")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "low-stock"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock & Reorders ({lowStockData?.totalLowStock || valuationData.lowStockCount})
        </button>

        <button
          onClick={() => setActiveTab("reservations")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "reservations"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookmarkCheck className="h-4 w-4 text-emerald-600" /> Reservations ({reservationsData?.totalCount || 0})
        </button>
      </div>

      {/* KPI Cards */}
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
          <span className="text-xs text-slate-400">Total active products in inventory</span>
        </div>

        {/* Total Units */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Units on Hand
            </span>
            <span className="rounded-full bg-emerald-50 p-1.5 text-emerald-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{valuationData.totalUnits} <span className="text-sm font-normal text-slate-500">units</span></p>
          <span className="text-xs text-slate-400">
            {selectedLocation === "ALL" ? "Across all warehouses" : `Filtered by selected location`}
          </span>
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

        {/* Inventory Valuation */}
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

      {/* TAB 1: CATALOG & STOCK */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Search & Location Filter Bar */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Warehouse Location Selector */}
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50/50"
                >
                  <option value="ALL">🏢 All Warehouses</option>
                  {locationsList.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.name} {loc.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>

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

            {finishes.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Variants:</span>
                {finishes.map((fin) => (
                  <button
                    key={fin}
                    onClick={() => setSelectedFinish(fin)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
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

          {/* Main Table */}
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product & Model</TableHead>
                  <TableHead>Variant / Attributes</TableHead>
                  <TableHead>HSN / Tax</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-center">Physical Stock</TableHead>
                  <TableHead className="text-center">Reserved</TableHead>
                  <TableHead className="text-center">Available Stock</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <TableSkeleton rows={5} cols={9} />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                      <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-medium text-slate-700">No matching products found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const physical = item.physicalStock ?? item.currentStock;
                    const reserved = item.reservedStock ?? 0;
                    const available = item.availableStock ?? Math.max(0, physical - reserved);

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors">
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

                        <TableCell>
                          <div className="font-mono text-xs text-slate-800 font-semibold">
                            HSN {item.hsnCode}
                          </div>
                          <span className="text-[11px] text-slate-400">GST {item.gstRate}%</span>
                        </TableCell>

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

                        {/* Physical Stock */}
                        <TableCell className="text-center font-mono text-xs font-semibold text-slate-800">
                          {physical} {item.uom}
                        </TableCell>

                        {/* Reserved Stock */}
                        <TableCell className="text-center font-mono text-xs text-amber-600 font-semibold">
                          {reserved > 0 ? `${reserved} ${item.uom}` : "—"}
                        </TableCell>

                        {/* Available Stock */}
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                              available <= 0
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : available <= item.minStockAlert
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {available <= item.minStockAlert && <AlertTriangle className="h-3 w-3" />}
                            {available} {item.uom}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAdjustingItem(item);
                                setAdjustmentDelta(1);
                                setAdjustmentLocationId(selectedLocation !== "ALL" ? selectedLocation : "");
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
                              onClick={() => {
                                setTransferForm({
                                  sourceLocationId: selectedLocation !== "ALL" ? selectedLocation : (locationsList[0]?.id || ""),
                                  destinationLocationId: locationsList[1]?.id || "",
                                  variantId: item.id,
                                  quantity: 1,
                                  notes: `Transfer for ${item.sku}`,
                                });
                                setIsTransferModalOpen(true);
                              }}
                              className="h-7 text-xs border-slate-200 text-slate-600 hover:bg-slate-100"
                              title="Transfer stock between warehouses"
                            >
                              <ArrowRightLeft className="h-3 w-3 text-blue-600" />
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      {/* TAB 2: WAREHOUSES MANAGEMENT */}
      {activeTab === "warehouses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inventory Locations & Warehouses</h2>
              <p className="text-xs text-slate-500">
                Manage physical storage facilities, central godowns, and shop counters
              </p>
            </div>
            <Button
              onClick={() => {
                setWarehouseForm({ name: "", code: "", address: "", isDefault: false });
                setWarehouseError("");
                setIsAddWarehouseOpen(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Warehouse
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locationsList.map((loc: any) => (
              <div
                key={loc.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 relative hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-base">{loc.name}</span>
                      {loc.isDefault && (
                        <span className="rounded bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5">
                          Default
                        </span>
                      )}
                    </div>
                    {loc.code && <span className="font-mono text-xs text-slate-500 font-semibold">{loc.code}</span>}
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      loc.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {loc.isActive ? "Active" : "Archived"}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>📍 Address: {loc.address || "Not specified"}</div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 font-medium">
                    <span>SKUs: <strong className="text-slate-800">{loc.totalSkus || 0}</strong></span>
                    <span>Total Stock: <strong className="text-slate-800">{loc.totalUnits || 0} units</strong></span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingWarehouse(loc);
                      setWarehouseForm({
                        name: loc.name,
                        code: loc.code || "",
                        address: loc.address || "",
                        isDefault: loc.isDefault,
                      });
                      setIsEditWarehouseOpen(true);
                    }}
                    className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchiveWarehouse(loc)}
                    className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Safely archive location (requires 0 active stock)"
                  >
                    <Archive className="mr-1 h-3 w-3" /> Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STOCK TRANSFERS */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Warehouse Transfers Log</h2>
              <p className="text-xs text-slate-500">
                Traceable audit trail of inter-facility stock movements with immutable balances
              </p>
            </div>
            <Button
              onClick={() => {
                setTransferForm({
                  sourceLocationId: locationsList[0]?.id || "",
                  destinationLocationId: locationsList[1]?.id || "",
                  variantId: items[0]?.id || "",
                  quantity: 1,
                  notes: "",
                });
                setTransferError("");
                setTransferSuccess("");
                setIsTransferModalOpen(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" /> New Transfer
            </Button>
          </div>

          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer Ref</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Item / Variant</TableHead>
                  <TableHead className="text-center">Direction / Reason</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfersData?.transfers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <ArrowRightLeft className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-medium text-slate-700">No stock transfers recorded yet</p>
                      <p className="text-xs text-slate-400 mt-1">Execute your first inter-warehouse transfer above</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  transfersData?.transfers?.map((t: any) => (
                    <TableRow key={t.id} className="text-xs hover:bg-slate-50/70">
                      <TableCell className="font-mono font-semibold text-blue-600">{t.transferId || t.id.slice(-6)}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{t.locationName}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{t.productName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{t.sku}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            t.reason?.includes("IN") ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {t.reason || t.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900">
                        {t.quantity} {t.uom}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-slate-600">
                        {t.balanceAfter} {t.uom}
                      </TableCell>
                      <TableCell className="text-slate-500 italic max-w-xs truncate">{t.notes || "—"}</TableCell>
                      <TableCell className="text-slate-400 font-mono">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      {/* TAB 4: LOW STOCK & REORDERS */}
      {activeTab === "low-stock" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Low Stock & Intelligent Reorders</h2>
              <p className="text-xs text-slate-500">
                Monitors physical on-hand vs reserved commitments, identifying stockouts and replenishment quantities
              </p>
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50/50"
            >
              <option value="ALL">🏢 All Warehouses</option>
              {locationsList.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  📍 {loc.name}
                </option>
              ))}
            </select>
          </div>

          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product & SKU</TableHead>
                  <TableHead className="text-right">Physical Stock</TableHead>
                  <TableHead className="text-right">Reserved Stock</TableHead>
                  <TableHead className="text-right">Available Stock</TableHead>
                  <TableHead className="text-right">Safety Threshold</TableHead>
                  <TableHead className="text-center font-bold text-blue-700">Recommended Reorder</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockData?.lowStockItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                      <p className="font-medium text-slate-700">All stock levels are healthy!</p>
                      <p className="text-xs text-slate-400 mt-1">No items are currently below their minimum safety thresholds.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockData?.lowStockItems?.map((ls: any) => (
                    <TableRow key={ls.variantId} className="text-xs hover:bg-slate-50/70">
                      <TableCell>
                        <div className="font-semibold text-slate-900">{ls.productName}</div>
                        <div className="font-mono text-[11px] text-blue-600 font-semibold">{ls.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{ls.physicalStock} {ls.uom}</TableCell>
                      <TableCell className="text-right font-mono text-amber-600 font-semibold">
                        {ls.reservedStock > 0 ? `${ls.reservedStock} ${ls.uom}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-rose-600">
                        {ls.availableStock} {ls.uom}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-500">{ls.threshold} {ls.uom}</TableCell>
                      <TableCell className="text-center">
                        <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                          +{ls.suggestedReorder} {ls.uom}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            ls.isOutOfStock ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {ls.isOutOfStock ? "Out of Stock" : "Low Stock"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const found = items.find((i) => i.id === ls.variantId);
                            if (found) {
                              setAdjustingItem(found);
                              setAdjustmentDelta(ls.suggestedReorder);
                              setAdjustmentReason("OPENING_STOCK");
                              setIsAdjustModalOpen(true);
                            }
                          }}
                          className="h-7 text-xs border-slate-200 text-blue-600 font-semibold"
                        >
                          Replenish
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      {/* TAB 5: STOCK RESERVATIONS */}
      {activeTab === "reservations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Stock Reservations</h2>
              <p className="text-xs text-slate-500">
                Pending order allocations preventing overselling before invoice finalization
              </p>
            </div>
            <Button
              onClick={() => {
                setReserveForm({
                  variantId: items[0]?.id || "",
                  locationId: locationsList[0]?.id || "",
                  quantity: 1,
                  referenceType: "SALES_ORDER",
                  referenceId: `ORD-${Date.now().toString().slice(-6)}`,
                  notes: "",
                });
                setReserveError("");
                setIsReserveModalOpen(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
            >
              <BookmarkCheck className="mr-1.5 h-4 w-4" /> New Reservation
            </Button>
          </div>

          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Item & SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Reserved Quantity</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservationsData?.reservations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <BookmarkCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-medium text-slate-700">No stock reservations on file</p>
                      <p className="text-xs text-slate-400 mt-1">Reserve inventory for sales orders or estimates above</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reservationsData?.reservations?.map((r: any) => (
                    <TableRow key={r.id} className="text-xs hover:bg-slate-50/70">
                      <TableCell className="font-mono font-semibold text-slate-800">
                        {r.referenceType}: {r.referenceId}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{r.variant?.name || "Standard Item"}</div>
                        <div className="font-mono text-[11px] text-blue-600">{r.variant?.sku}</div>
                      </TableCell>
                      <TableCell className="text-slate-600">{r.location?.name || "All Locations"}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-amber-600">
                        {r.quantity} {r.variant?.product?.uom}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            r.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "RELEASED"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 italic max-w-xs truncate">{r.notes || "—"}</TableCell>
                      <TableCell className="text-slate-400 font-mono">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.status === "CONFIRMED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReleaseReservation(r.id)}
                            className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            Release
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      {/* MODAL 1: STOCK ADJUSTMENT */}
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
                Warehouse Location (Optional)
              </label>
              <select
                value={adjustmentLocationId}
                onChange={(e) => setAdjustmentLocationId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="">Default Location</option>
                {locationsList.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Delta ({adjustingItem.uom})
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step={["KG", "MTR"].includes(adjustingItem.uom) ? "0.001" : "1"}
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(parseFloat(e.target.value) || 0)}
                  placeholder="Enter positive or negative quantity"
                />
                <div className="text-xs text-slate-500 font-semibold whitespace-nowrap">
                  New: <span className="font-mono text-slate-900">{adjustingItem.currentStock + adjustmentDelta}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Reason *
              </label>
              <select
                value={adjustmentReason}
                onChange={(e: any) => setAdjustmentReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="AUDIT_CORRECTION">Audit Correction (Physical Count Discrepancy)</option>
                <option value="OPENING_STOCK">Opening Stock Batch</option>
                <option value="DAMAGED">Damaged Goods / Scrap</option>
                <option value="SCRAPPED">Scrapped / Write-Off</option>
                <option value="INTERNAL_USE">Internal Store Use / Display Sample</option>
                <option value="THEFT_OR_LOSS">Theft or Shrinkage Loss</option>
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
                placeholder="e.g. Monthly physical inventory verification"
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

      {/* MODAL 2: ADD WAREHOUSE */}
      <Dialog
        isOpen={isAddWarehouseOpen}
        onClose={() => setIsAddWarehouseOpen(false)}
        title="Add Inventory Location / Warehouse"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4 pt-2">
          {warehouseError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {warehouseError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location Name *</label>
            <Input
              required
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
              placeholder="e.g. Central Godown, Warehouse B, Main Store Counter"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Code</label>
            <Input
              value={warehouseForm.code}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
              placeholder="e.g. WH-01, CG-MAIN"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Landmark</label>
            <Input
              value={warehouseForm.address}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
              placeholder="e.g. Plot 42, Industrial Area Phase 2"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="wh-default"
              checked={warehouseForm.isDefault}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, isDefault: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="wh-default" className="text-xs text-slate-700 font-medium">
              Set as primary default location for this tenant
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddWarehouseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Create Warehouse
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 3: EDIT WAREHOUSE */}
      <Dialog
        isOpen={isEditWarehouseOpen}
        onClose={() => {
          setIsEditWarehouseOpen(false);
          setEditingWarehouse(null);
        }}
        title="Edit Inventory Location"
      >
        <form onSubmit={handleUpdateWarehouse} className="space-y-4 pt-2">
          {warehouseError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {warehouseError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location Name *</label>
            <Input
              required
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Code</label>
            <Input
              value={warehouseForm.code}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <Input
              value={warehouseForm.address}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="wh-edit-default"
              checked={warehouseForm.isDefault}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, isDefault: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="wh-edit-default" className="text-xs text-slate-700 font-medium">
              Set as primary default location
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setIsEditWarehouseOpen(false);
                setEditingWarehouse(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 4: STOCK TRANSFER */}
      <Dialog
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Execute Warehouse Stock Transfer"
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4 pt-2">
          {transferError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {transferError}
            </div>
          )}
          {transferSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-semibold">
              {transferSuccess}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Warehouse *</label>
              <select
                required
                value={transferForm.sourceLocationId}
                onChange={(e) => setTransferForm({ ...transferForm, sourceLocationId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="">Select Source Location</option>
                {locationsList.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Warehouse *</label>
              <select
                required
                value={transferForm.destinationLocationId}
                onChange={(e) => setTransferForm({ ...transferForm, destinationLocationId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="">Select Destination Location</option>
                {locationsList.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Variant *</label>
            <select
              required
              value={transferForm.variantId}
              onChange={(e) => setTransferForm({ ...transferForm, variantId: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="">Select Item to Transfer</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.productName} ({it.sku}) — Available: {it.availableStock ?? it.currentStock} {it.uom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Quantity *</label>
            <Input
              required
              type="number"
              step="any"
              min="0.001"
              value={transferForm.quantity}
              onChange={(e) => setTransferForm({ ...transferForm, quantity: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Notes (Optional)</label>
            <Input
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              placeholder="e.g. Stock balancing across stores"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Execute Atomic Transfer
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 5: STOCK RESERVATION */}
      <Dialog
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        title="Reserve Inventory for Order / Customer"
      >
        <form onSubmit={handleCreateReservation} className="space-y-4 pt-2">
          {reserveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {reserveError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Variant *</label>
            <select
              required
              value={reserveForm.variantId}
              onChange={(e) => setReserveForm({ ...reserveForm, variantId: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="">Select Variant</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.productName} ({it.sku}) — Available: {it.availableStock ?? it.currentStock} {it.uom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse (Optional)</label>
            <select
              value={reserveForm.locationId}
              onChange={(e) => setReserveForm({ ...reserveForm, locationId: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="">All Warehouses</option>
              {locationsList.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
              <Input
                required
                type="number"
                step="any"
                min="0.001"
                value={reserveForm.quantity}
                onChange={(e) => setReserveForm({ ...reserveForm, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference ID *</label>
              <Input
                required
                value={reserveForm.referenceId}
                onChange={(e) => setReserveForm({ ...reserveForm, referenceId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <Input
              value={reserveForm.notes}
              onChange={(e) => setReserveForm({ ...reserveForm, notes: e.target.value })}
              placeholder="e.g. Reserved for Pending Customer Estimate #1024"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsReserveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Confirm Reservation
            </Button>
          </div>
        </form>
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
                          : m.type === "TRANSFER"
                          ? "bg-blue-100 text-blue-800"
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
                  <div className="text-[11px] text-slate-600 font-medium">
                    Warehouse: {m.locationName || "Default Warehouse"}
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
                placeholder="e.g. Basin Mixer, Sanitaryware Closet, CPVC Pipe"
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
                placeholder="e.g. Jaquar, Hindware, Cera, Kohler"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <Input
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                placeholder="e.g. Faucets, Sanitaryware, Fittings"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model / Edition
              </label>
              <Input
                value={newItem.model}
                onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                placeholder="e.g. Concealed, Rimless, Single Lever"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Size / Dimension / Spec</label>
              <Input
                value={newItem.size}
                onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                placeholder="e.g. 18x12, 1/2 inch, 25mm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Variant / Color / Attribute</label>
              <Input
                value={newItem.colorFinish}
                onChange={(e) => setNewItem({ ...newItem, colorFinish: e.target.value })}
                placeholder="e.g. Chrome Plated, Glossy White, Matt Black"
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
                <option value="SET">SET (Sets)</option>
                <option value="PAIR">PAIR (Pairs)</option>
                <option value="BOX">BOX (Boxes / Cartons)</option>
                <option value="MTR">MTR (Meters - 3 Decimals)</option>
                <option value="KG">KG (Kilograms - 3 Decimals)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Material / Body</label>
              <Input
                value={newItem.material}
                onChange={(e) => setNewItem({ ...newItem, material: e.target.value })}
                placeholder="e.g. Brass, Ceramic, SS-304"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mounting Type</label>
              <Input
                value={newItem.mountingType}
                onChange={(e) => setNewItem({ ...newItem, mountingType: e.target.value })}
                placeholder="e.g. Wall Hung, Deck Mounted"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty (Years)</label>
              <Input
                value={newItem.warrantyDuration}
                onChange={(e) => setNewItem({ ...newItem, warrantyDuration: e.target.value })}
                placeholder="e.g. 5, 7, 10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
              <Input
                value={newItem.hsnCode}
                onChange={(e) => setNewItem({ ...newItem, hsnCode: e.target.value })}
                placeholder="e.g. 8481, 6910, 7412"
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
                step={["KG", "MTR"].includes(newItem.uom) ? "0.001" : "1"}
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
