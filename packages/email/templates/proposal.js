Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalTemplate = void 0;
const components_1 = require("@react-email/components");
const ProposalTemplate = ({
  recipientName,
  proposalTitle,
  proposalUrl,
  message,
  totalAmount,
}) => (
  <components_1.Tailwind>
    <components_1.Html>
      <components_1.Head />
      <components_1.Preview>Proposal: {proposalTitle}</components_1.Preview>
      <components_1.Body className="bg-zinc-50 font-sans">
        <components_1.Container className="mx-auto py-12">
          <components_1.Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <components_1.Section className="rounded-[5px] bg-white p-8">
              <components_1.Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                New Proposal
              </components_1.Text>
              <components_1.Text className="m-0 text-zinc-500">
                Dear {recipientName},
              </components_1.Text>
              <components_1.Text className="mt-4 text-zinc-500">
                We are pleased to present our proposal:{" "}
                <strong>{proposalTitle}</strong>
              </components_1.Text>
              {totalAmount && (
                <components_1.Text className="mt-2 text-zinc-500">
                  Total Amount: <strong>{totalAmount}</strong>
                </components_1.Text>
              )}
              {message && (
                <>
                  <components_1.Text className="mt-4 text-zinc-500">
                    Message:
                  </components_1.Text>
                  <components_1.Text className="text-zinc-500">
                    {message}
                  </components_1.Text>
                </>
              )}
              <components_1.Section className="mt-8 mb-8 text-center">
                <components_1.Button
                  className="rounded-md bg-zinc-950 px-6 py-3 text-base font-semibold text-zinc-50"
                  href={proposalUrl}
                >
                  View Proposal
                </components_1.Button>
              </components_1.Section>
              <components_1.Text className="m-0 text-sm text-zinc-400">
                If the button above doesn't work, you can copy and paste this
                link into your browser:
              </components_1.Text>
              <components_1.Text className="text-sm text-zinc-400">
                {proposalUrl}
              </components_1.Text>
              <components_1.Hr className="my-6 border-zinc-200" />
              <components_1.Text className="m-0 text-sm text-zinc-400">
                This is an automated message. Please do not reply to this email.
              </components_1.Text>
            </components_1.Section>
          </components_1.Section>
        </components_1.Container>
      </components_1.Body>
    </components_1.Html>
  </components_1.Tailwind>
);
exports.ProposalTemplate = ProposalTemplate;
exports.ProposalTemplate.PreviewProps = {
  recipientName: "Jane Smith",
  proposalTitle: "Wedding Catering Proposal",
  proposalUrl: "https://example.com/proposals/abc123",
  totalAmount: "$5,000.00",
  message:
    "We have prepared a custom proposal for your upcoming event. Please review and let us know if you have any questions.",
};
exports.default = exports.ProposalTemplate;
