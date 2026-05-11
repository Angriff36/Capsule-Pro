import { redirect } from "next/navigation";
import {
  createCycleCountRecord,
  listCycleCountRecords,
} from "../actions/records";
import { getCycleCountSession } from "../actions/sessions";
import type { CycleCountRecord } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let session;
  try {
    session = await getCycleCountSession(sessionId);
  } catch {
    redirect("/cycle-counting");
  }

  if (!session) {
    redirect("/cycle-counting");
  }

  let records: CycleCountRecord[];
  try {
    records = await listCycleCountRecords(sessionId);
  } catch {
    records = [];
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await createCycleCountRecord({
      sessionId,
      itemId: "00000000-0000-0000-0000-000000000000",
      itemNumber: formData.get("itemNumber") as string,
      itemName: formData.get("itemName") as string,
      storageLocationId: "00000000-0000-0000-0000-000000000000",
      expectedQuantity: Number(formData.get("expectedQuantity") as string),
      countedQuantity: Number(formData.get("countedQuantity") as string),
      barcode: (formData.get("barcode") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });

    if (result.success) {
      redirect(`/cycle-counting/${sessionId}`);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          className="text-gray-600 hover:text-gray-900 mb-4"
          onClick={() => redirect("/cycle-counting")}
          type="button"
        >
          ← Back to Sessions
        </button>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {session.sessionName}
        </h1>

        <div className="mb-4 flex space-x-4 text-sm">
          <span className="text-gray-600">Type: {session.countType}</span>
          <span className="text-gray-600">Status: {session.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="itemNumber"
            >
              Item Number
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="itemNumber"
              name="itemNumber"
              placeholder="Enter item number"
              required
              type="text"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="itemName"
            >
              Item Name
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="itemName"
              name="itemName"
              placeholder="Enter item name"
              required
              type="text"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="expectedQuantity"
            >
              Expected Quantity
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="expectedQuantity"
              name="expectedQuantity"
              placeholder="Enter expected quantity"
              required
              step="0.001"
              type="number"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="countedQuantity"
            >
              Counted Quantity
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="countedQuantity"
              name="countedQuantity"
              placeholder="Enter counted quantity"
              required
              step="0.001"
              type="number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="barcode">
              Barcode (optional)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="barcode"
              name="barcode"
              placeholder="Scan or enter barcode"
              type="text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="notes"
              name="notes"
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            formAction="submit"
            type="submit"
          >
            Submit Count
          </button>
        </form>

        <div>
          <h2 className="text-xl font-semibold mb-4">Count Records</h2>

          {records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No count records yet. Start counting items.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Number</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: CycleCountRecord) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.itemNumber}</TableCell>
                    <TableCell>{record.itemName}</TableCell>
                    <TableCell className="text-right">{record.expectedQuantity.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-medium">{record.countedQuantity.toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      {record.variance < 0 ? (
                        <span className="text-red-600">{Math.abs(record.variance).toFixed(3)}</span>
                      ) : (
                        <span className="text-green-600">{Math.abs(record.variance).toFixed(3)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
