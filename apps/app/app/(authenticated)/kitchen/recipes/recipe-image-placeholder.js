"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeImagePlaceholder = void 0;
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const clipboard_image_button_1 = require("../../components/clipboard-image-button");
const RecipeImagePlaceholder = ({ recipeName, uploadAction }) => {
  const inputRef = (0, react_1.useRef)(null);
  const [isPending, startTransition] = (0, react_1.useTransition)();
  const submitFile = (file) => {
    const formData = new FormData();
    formData.set("imageFile", file);
    startTransition(() => {
      void uploadAction(formData);
    });
  };
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    submitFile(file);
    event.target.value = "";
  };
  return (
    <>
      <div className="flex h-full w-full flex-col gap-3 bg-linear-to-br from-slate-200 via-slate-100 to-white p-3 text-muted-foreground">
        <button
          aria-label={`Add image for ${recipeName}`}
          className="flex flex-1 flex-col items-center justify-center gap-2 transition-opacity hover:opacity-90"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <lucide_react_1.ChefHatIcon size={32} />
          <span className="text-xs">Click to add image</span>
        </button>
        <clipboard_image_button_1.ClipboardImageButton
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-muted-foreground/30 border-dashed bg-white/80 px-3 py-3 font-medium text-foreground text-xs transition-colors hover:border-muted-foreground/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          disabled={isPending}
          label="Paste from clipboard"
          onImage={submitFile}
          showUploadIcon
        />
      </div>
      <input
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
    </>
  );
};
exports.RecipeImagePlaceholder = RecipeImagePlaceholder;
