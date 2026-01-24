Object.defineProperty(exports, "__esModule", { value: true });
const toolbar_1 = require("@repo/cms/components/toolbar");
const LegalLayout = ({ children }) => (
  <>
    {children}
    <toolbar_1.Toolbar />
  </>
);
exports.default = LegalLayout;
