import { listCycleCountSessions, createCycleCountSession } from "./actions/sessions";
import { redirect } from "next/navigation";

export default async function CycleCountingPage() {
  const sessions = await listCycleCountSessions();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cycle Counting</h1>
        <p className="text-gray-600 mt-2">
          Manage inventory cycle counts with automated variance tracking and adjustments.
        </p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          const result = await createCycleCountSession({
            locationId: "00000000-0000-0000-0000-000000000000",
            sessionName: formData.get("sessionName") as string,
            countType: "ad_hoc",
            notes: formData.get("notes") as string || undefined,
          });

          if (result.success) {
            redirect(`/cycle-counting/${result.session?.sessionId}`);
          }
        }}
        className="mb-6"
      >
        <div className="mb-4">
          <label
            htmlFor="sessionName"
            className="block text-sm font-medium mb-2"
          >
            Session Name
          </label>
          <input
            type="text"
            id="sessionName"
            name="sessionName"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Main Warehouse Count"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="notes"
            className="block text-sm font-medium mb-2"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Optional notes..."
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create New Session
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">
          Recent Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No cycle count sessions found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`/cycle-counting/${session.sessionId}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        {session.sessionName}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {session.countType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          session.status === "finalized"
                            ? "bg-green-100 text-green-800"
                            : session.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {session.variancePercentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
