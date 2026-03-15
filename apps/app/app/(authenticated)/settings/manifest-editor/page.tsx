import { ManifestEditorClient } from "./manifest-editor-client";

const ManifestEditorPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold">Rules Explorer</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Read-only view of what actions exist, what can block them, and who can run
      them (compiled from Manifest).
    </p>
    <div className="mt-6">
      <ManifestEditorClient />
    </div>
  </div>
);

export default ManifestEditorPage;
