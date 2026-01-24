"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.DevConsoleBodyClass = void 0;
const react_1 = require("react");
const DevConsoleBodyClass = () => {
  (0, react_1.useEffect)(() => {
    document.body.classList.add("dev-console");
    return () => {
      document.body.classList.remove("dev-console");
    };
  }, []);
  return null;
};
exports.DevConsoleBodyClass = DevConsoleBodyClass;
