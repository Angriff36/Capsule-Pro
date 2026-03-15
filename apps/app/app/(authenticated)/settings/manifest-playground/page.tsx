import { ManifestPlaygroundClient } from "./manifest-playground-client";

const ManifestPlaygroundPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold">Manifest Playground</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Inspect command surfaces and try example inputs (execution is read-only).
    </p>
    <div className="mt-6">
      <ManifestPlaygroundClient />
    </div>
  </div>
);

export default ManifestPlaygroundPage;

