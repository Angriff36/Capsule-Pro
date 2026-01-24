var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get() {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  ((m, exports) => {
    for (var p in m)
      if (p !== "default" && !Object.hasOwn(exports, p))
        __createBinding(exports, m, p);
  });
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonLd = void 0;
const escapeJsonForHtml = (json) =>
  json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
const JsonLd = ({ code }) => (
  <script
    dangerouslySetInnerHTML={{
      __html: escapeJsonForHtml(JSON.stringify(code)),
    }}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: "This is a JSON-LD script with properly escaped content."
    type="application/ld+json"
  />
);
exports.JsonLd = JsonLd;
__exportStar(require("schema-dts"), exports);
