import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export type ProposalTemplateProps = {
  readonly recipientName: string;
  readonly proposalTitle: string;
  readonly proposalUrl: string;
  readonly message?: string;
  readonly totalAmount?: string;
};

export const ProposalTemplate = ({
  recipientName,
  proposalTitle,
  proposalUrl,
  message,
  totalAmount,
}: ProposalTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Proposal: {proposalTitle}</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                New Proposal
              </Text>
              <Text className="m-0 text-zinc-500">Dear {recipientName},</Text>
              <Text className="mt-4 text-zinc-500">
                We are pleased to present our proposal: <strong>{proposalTitle}</strong>
              </Text>
              {totalAmount && (
                <Text className="mt-2 text-zinc-500">
                  Total Amount: <strong>{totalAmount}</strong>
                </Text>
              )}
              {message && (
                <>
                  <Text className="mt-4 text-zinc-500">Message:</Text>
                  <Text className="text-zinc-500">{message}</Text>
                </>
              )}
              <Section className="mt-8 mb-8 text-center">
                <Button
                  className="rounded-md bg-zinc-950 px-6 py-3 text-base font-semibold text-zinc-50"
                  href={proposalUrl}
                >
                  View Proposal
                </Button>
              </Section>
              <Text className="m-0 text-sm text-zinc-400">
                If the button above doesn't work, you can copy and paste this link into
                your browser:
              </Text>
              <Text className="text-sm text-zinc-400">{proposalUrl}</Text>
              <Hr className="my-6 border-zinc-200" />
              <Text className="m-0 text-sm text-zinc-400">
                This is an automated message. Please do not reply to this email.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

ProposalTemplate.PreviewProps = {
  recipientName: "Jane Smith",
  proposalTitle: "Wedding Catering Proposal",
  proposalUrl: "https://example.com/proposals/abc123",
  totalAmount: "$5,000.00",
  message:
    "We have prepared a custom proposal for your upcoming event. Please review and let us know if you have any questions.",
};

export default ProposalTemplate;
