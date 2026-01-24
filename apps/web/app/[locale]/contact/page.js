Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = void 0;
const internationalization_1 = require("@repo/internationalization");
const metadata_1 = require("@repo/seo/metadata");
const contact_form_1 = require("./components/contact-form");
const generateMetadata = async ({ params }) => {
  const { locale } = await params;
  const dictionary = await (0, internationalization_1.getDictionary)(locale);
  return (0, metadata_1.createMetadata)(dictionary.web.contact.meta);
};
exports.generateMetadata = generateMetadata;
const Contact = async ({ params }) => {
  const { locale } = await params;
  const dictionary = await (0, internationalization_1.getDictionary)(locale);
  return <contact_form_1.ContactForm dictionary={dictionary} />;
};
exports.default = Contact;
