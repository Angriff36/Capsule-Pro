"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.detectConflicts = detectConflicts;
async function detectConflicts(request) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";
  const response = await fetch(`${baseUrl}/conflicts/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to detect conflicts: ${response.statusText}`);
  }
  return await response.json();
}
