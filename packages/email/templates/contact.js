Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactTemplate = void 0;
const components_1 = require("@react-email/components");
const ContactTemplate = ({ name, email, message }) => (
  <components_1.Tailwind>
    <components_1.Html>
      <components_1.Head />
      <components_1.Preview>New email from {name}</components_1.Preview>
      <components_1.Body className="bg-zinc-50 font-sans">
        <components_1.Container className="mx-auto py-12">
          <components_1.Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <components_1.Section className="rounded-[5px] bg-white p-8">
              <components_1.Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                New email from {name}
              </components_1.Text>
              <components_1.Text className="m-0 text-zinc-500">
                {name} ({email}) has sent you a message:
              </components_1.Text>
              <components_1.Hr className="my-4" />
              <components_1.Text className="m-0 text-zinc-500">
                {message}
              </components_1.Text>
            </components_1.Section>
          </components_1.Section>
        </components_1.Container>
      </components_1.Body>
    </components_1.Html>
  </components_1.Tailwind>
);
exports.ContactTemplate = ContactTemplate;
exports.ContactTemplate.PreviewProps = {
  name: "Jane Smith",
  email: "jane.smith@example.com",
  message: "I'm interested in your services.",
};
exports.default = exports.ContactTemplate;
