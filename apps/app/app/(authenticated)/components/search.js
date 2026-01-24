Object.defineProperty(exports, "__esModule", { value: true });
exports.Search = void 0;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const lucide_react_1 = require("lucide-react");
const Search = () => (
  <form action="/search" className="flex items-center gap-2 px-4">
    <div className="relative">
      <div className="absolute top-px bottom-px left-px flex h-8 w-8 items-center justify-center">
        <lucide_react_1.SearchIcon
          className="text-muted-foreground"
          size={16}
        />
      </div>
      <input_1.Input
        className="h-auto bg-background py-1.5 pr-3 pl-8 text-xs"
        name="q"
        placeholder="Search"
        type="text"
      />
      <button_1.Button
        className="absolute top-px right-px bottom-px h-8 w-8"
        size="icon"
        variant="ghost"
      >
        <lucide_react_1.ArrowRightIcon
          className="text-muted-foreground"
          size={16}
        />
      </button_1.Button>
    </div>
  </form>
);
exports.Search = Search;
