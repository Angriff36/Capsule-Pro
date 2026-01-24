// Payroll Engine Package
// Provides payroll calculation, tax computation, and export functionality
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
// Re-export core calculation functions
__exportStar(require("./core"), exports);
// Re-export exporters
__exportStar(require("./exporters"), exports);
// Re-export models
__exportStar(require("./models"), exports);
// Re-export services
__exportStar(require("./services"), exports);
// Re-export data sources
__exportStar(require("./dataSource"), exports);
