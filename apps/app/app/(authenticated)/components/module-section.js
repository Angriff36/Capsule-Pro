Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleSection = void 0;
const ModuleSection = ({ title, summary }) => (
  <div className="space-y-2">
    <h1 className="font-semibold text-2xl text-foreground">{title}</h1>
    <p className="max-w-2xl text-muted-foreground text-sm">{summary}</p>
  </div>
);
exports.ModuleSection = ModuleSection;
