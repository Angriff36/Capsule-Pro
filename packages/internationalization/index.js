var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDictionary = exports.locales = void 0;
require("server-only");
const languine_json_1 = __importDefault(require("./languine.json"));
exports.locales = [
  languine_json_1.default.locale.source,
  ...languine_json_1.default.locale.targets,
];
const dictionaries = Object.fromEntries(
  exports.locales.map((locale) => [
    locale,
    () =>
      import(`./dictionaries/${locale}.json`)
        .then((mod) => mod.default)
        .catch((_err) =>
          import("./dictionaries/en.json").then((mod) => mod.default)
        ),
  ])
);
const getDictionary = async (locale) => {
  const normalizedLocale = locale.split("-")[0];
  if (!exports.locales.includes(normalizedLocale)) {
    return dictionaries.en();
  }
  try {
    return await dictionaries[normalizedLocale]();
  } catch (_error) {
    return dictionaries.en();
  }
};
exports.getDictionary = getDictionary;
