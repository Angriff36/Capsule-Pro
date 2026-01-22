import { redirect } from "next/navigation";
import {
  createCycleCountRecord,
  listCycleCountRecords,
} from "../actions/records";
import { getCycleCountSession } from "../actions/sessions";
import type { CycleCountRecord } from "../types";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await getCycleCountSession(sessionId);

  if (!session) {
    redirect("/cycle-counting");
  }

  const records = await listCycleCountRecords(sessionId);

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
        >
          ← Back to Sessions
        </button>

        <h1 className="text-3xl font-bold mb-2">{session.sessionName}</h1>

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
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Counted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record: CycleCountRecord) => (
                    <tr className="hover:bg-gray-50" key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.itemNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.itemName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.expectedQuantity.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {record.countedQuantity.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          if (record.variance < 0) {
                            return (
                              <span className="text-red-600">
                                {Math.abs(record.variance).toFixed(3)}
                              </span>
                            );
                          }
                          return (
                            <span className="text-green-600">
                              {Math.abs(record.variance).toFixed(3)}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
