Object.defineProperty(exports, "__esModule", { value: true });
exports.TableOfContents = void 0;
const react_rich_text_1 = require("basehub/react-rich-text");
const TableOfContents = ({ data, ...props }) => (
  <div>
    <react_rich_text_1.RichText
      // @ts-expect-error "idk"
      components={{
        ol: ({ children }) => (
          <ol className="flex list-none flex-col gap-2 text-sm">{children}</ol>
        ),
        ul: ({ children }) => (
          <ul className="flex list-none flex-col gap-2 text-sm">{children}</ul>
        ),
        li: ({ children }) => <li className="pl-3">{children}</li>,
        a: ({ children, href }) => (
          <a
            className="line-clamp-3 flex rounded-sm text-foreground text-sm underline decoration-foreground/0 transition-colors hover:decoration-foreground/50"
            href={`#${href?.split("#").at(1)}`}
          >
            {children}
          </a>
        ),
      }}
      {...props}
    >
      {data}
    </react_rich_text_1.RichText>
  </div>
);
exports.TableOfContents = TableOfContents;
