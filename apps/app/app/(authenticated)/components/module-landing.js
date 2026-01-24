Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleLanding = void 0;
const card_1 = require("@repo/design-system/components/ui/card");
const ModuleLanding = ({ title, summary, highlights }) => (
  <div className="space-y-6">
    <header className="space-y-2">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Overview
      </p>
      <h1 className="font-semibold text-2xl text-foreground">{title}</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">{summary}</p>
    </header>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {highlights.map((item) => (
        <card_1.Card className="bg-card/60 p-4" key={item}>
          <p className="text-muted-foreground text-sm">{item}</p>
        </card_1.Card>
      ))}
    </div>
  </div>
);
exports.ModuleLanding = ModuleLanding;
