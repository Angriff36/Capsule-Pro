"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design-system/components/ui/card"
import { Button } from "@repo/design-system/components/ui/button"
import { Input } from "@repo/design-system/components/ui/input"
import { Badge } from "@repo/design-system/components/ui/badge"
import { Search, Package, CheckCircle, XCircle, AlertTriangle, FileText, TrendingUp } from "lucide-react"
import { toast } from "sonner"

type QualityStatus = "pending" | "approved" | "rejected" | "needs_inspection"
type DiscrepancyType = "shortage" | "overage" | "damaged" | "wrong_item" | "none"

type POItem = {
  id: string
  item_number: string
  name: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
  quality_status: QualityStatus
  discrepancy_type: DiscrepancyType | null
  discrepancy_amount: number | null
  notes: string
}

type PurchaseOrder = {
  id: string
  po_number: string
  vendor_name: string
  status: string
  order_date: string
  expected_delivery_date: string | null
  subtotal: number
  tax_amount: number
  total: number
  items: POItem[]
}

export default function ReceivingPage() {
  const [searchPO, setSearchPO] = useState("")
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [scanning, setScanning] = useState(false)

  const handlePOSearch = () => {
    if (!searchPO.trim()) {
      toast.error("Please enter a PO number")
      return
    }

    setScanning(true)
    setTimeout(() => {
      setSelectedPO({
        id: "1",
        po_number: searchPO,
        vendor_name: "Fresh Farms Supply Co.",
        status: "confirmed",
        order_date: "2026-01-20",
        expected_delivery_date: "2026-01-22",
        subtotal: 1250.00,
        tax_amount: 100.00,
        total: 1350.00,
        items: [
          {
            id: "1",
            item_number: "PROD-001",
            name: "Organic Tomatoes",
            quantity_ordered: 50,
            quantity_received: 0,
            unit_cost: 15.00,
            total_cost: 750.00,
            quality_status: "pending",
            discrepancy_type: null,
            discrepancy_amount: null,
            notes: ""
          },
          {
            id: "2",
            item_number: "PROD-002",
            name: "Fresh Lettuce",
            quantity_ordered: 30,
            quantity_received: 0,
            unit_cost: 8.50,
            total_cost: 255.00,
            quality_status: "pending",
            discrepancy_type: null,
            discrepancy_amount: null,
            notes: ""
          }
        ]
      })
      setScanning(false)
      toast.success(`PO ${searchPO} loaded successfully`)
    }, 1000)
  }

  const handleScan = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      toast.success("Item scanned: PROD-001 - Organic Tomatoes")
    }, 1500)
  }

  const updateItemQuality = (itemId: string, status: QualityStatus) => {
    if (!selectedPO) {
      return
    }
    const updatedItems = selectedPO.items.map(item =>
      item.id === itemId ? { ...item, quality_status: status } : item
    )
    setSelectedPO({ ...selectedPO, items: updatedItems })
  }

  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    if (!selectedPO) {
      return
    }
    const updatedItems = selectedPO.items.map(item =>
      item.id === itemId ? { ...item, quantity_received: quantity } : item
    )
    setSelectedPO({ ...selectedPO, items: updatedItems })
  }

  const completeReceiving = () => {
    if (!selectedPO) {
      return
    }
    toast.success("Receiving completed. Stock levels updated.")
    setSelectedPO(null)
    setSearchPO("")
  }

  const getQualityBadge = (status: QualityStatus) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      needs_inspection: "bg-orange-100 text-orange-800"
    }
    return styles[status]
  }

  const getQualityIcon = (status: QualityStatus) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "needs_inspection":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warehouse Receiving</h1>
          <p className="text-muted-foreground">Scan items, log receipts, and update stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </Button>
          <Button variant="outline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Supplier Performance
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Purchase Order Lookup
          </CardTitle>
          <CardDescription>
            Enter PO number or scan barcode to begin receiving process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter PO number or scan barcode..."
              value={searchPO}
              onChange={(e) => setSearchPO(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePOSearch()}
              className="flex-1"
              disabled={scanning}
            />
            <Button onClick={handlePOSearch} disabled={scanning} className="gap-2">
              <Search className="h-4 w-4" />
              {scanning ? "Searching..." : "Search"}
            </Button>
            <Button onClick={handleScan} variant="secondary" disabled={scanning} className="gap-2">
              <Package className="h-4 w-4" />
              {scanning ? "Scanning..." : "Scan Item"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedPO && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle>PO Items</CardTitle>
              <CardDescription>
                Review items and log receipts with quality checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedPO.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <Badge variant="secondary">{item.item_number}</Badge>
                          <Badge className={getQualityBadge(item.quality_status)}>
                            <div className="flex items-center gap-1">
                              {getQualityIcon(item.quality_status)}
                              <span className="capitalize">{item.quality_status}</span>
                            </div>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Ordered: {item.quantity_ordered} @ ${item.unit_cost.toFixed(2)}/unit
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${item.total_cost.toFixed(2)}</p>
                        {item.discrepancy_type && (
                          <Badge variant="destructive" className="mt-1">
                            {item.discrepancy_type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`qty-${item.id}`} className="text-sm font-medium">
                          Quantity Received
                        </label>
                        <Input
                          id={`qty-${item.id}`}
                          type="number"
                          value={item.quantity_received}
                          onChange={(e) => updateReceivedQuantity(item.id, Number.parseFloat(e.target.value) || 0)}
                          min="0"
                          max={item.quantity_ordered}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label htmlFor={`quality-${item.id}`} className="text-sm font-medium">
                          Quality Status
                        </label>
                        <select
                          id={`quality-${item.id}`}
                          value={item.quality_status}
                          onChange={(e) => updateItemQuality(item.id, e.target.value as QualityStatus)}
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="pending">Pending Review</option>
                          <option value="approved">Approved</option>
                          <option value="needs_inspection">Needs Inspection</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    {item.quality_status === "rejected" || item.quality_status === "needs_inspection" ? (
                      <div>
                        <label htmlFor={`discrepancy-${item.id}`} className="text-sm font-medium">
                          Discrepancy Type
                        </label>
                        <select
                          id={`discrepancy-${item.id}`}
                          value={item.discrepancy_type || "none"}
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="none">None</option>
                          <option value="shortage">Shortage</option>
                          <option value="overage">Overage</option>
                          <option value="damaged">Damaged</option>
                          <option value="wrong_item">Wrong Item</option>
                        </select>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedPO(null)}>
                  Cancel
                </Button>
                <Button onClick={completeReceiving} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Complete Receiving
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PO Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PO Number</span>
                  <span className="font-semibold">{selectedPO.po_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-semibold">{selectedPO.vendor_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Date</span>
                  <span className="font-semibold">{selectedPO.order_date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Delivery</span>
                  <span className="font-semibold">
                    {selectedPO.expected_delivery_date || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="capitalize">
                    {selectedPO.status}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${selectedPO.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${selectedPO.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${(selectedPO.total - selectedPO.subtotal - selectedPO.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${selectedPO.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <h4 className="font-semibold text-sm">Receiving Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Received</span>
                    <span>
                      {selectedPO.items.filter(i => i.quantity_received > 0).length} / {selectedPO.items.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span>
                      {selectedPO.items.reduce((sum, i) => sum + i.quantity_received, 0)} / {selectedPO.items.reduce((sum, i) => sum + i.quantity_ordered, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quality Issues</span>
                    <span className="text-red-600">
                      {selectedPO.items.filter(i => i.quality_status === "rejected" || i.quality_status === "needs_inspection").length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
