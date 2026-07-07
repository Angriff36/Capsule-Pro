import PayrollRunDetailClient from "./client";

interface PayrollRunDetailPageProps {
  params: Promise<{ runId: string }>;
}

export default async function PayrollRunDetailPage({
  params,
}: PayrollRunDetailPageProps) {
  const { runId } = await params;

  return <PayrollRunDetailClient runId={runId} />;
}
