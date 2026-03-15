import { ManifestPlaygroundClient } from "./manifest-playground-client";

const ManifestPlaygroundPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold">Rules Playground</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Try example inputs and preview what would happen (this build is read-only;
      it will not run real commands).
    </p>
    <div className="mt-6">
      <ManifestPlaygroundClient />
    </div>
  </div>
);

export default ManifestPlaygroundPage;
