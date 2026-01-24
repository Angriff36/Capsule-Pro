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

export type ContractTemplateProps = {
  readonly clientName: string;
  readonly contractTitle: string;
  readonly signingUrl: string;
  readonly message?: string;
};

export const ContractTemplate = ({
  clientName,
  contractTitle,
  signingUrl,
  message,
}: ContractTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Contract for Signature: {contractTitle}</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                Contract for Signature
              </Text>
              <Text className="m-0 text-zinc-500">Dear {clientName},</Text>
              <Text className="mt-4 text-zinc-500">
                Please review and sign the contract:{" "}
                <strong>{contractTitle}</strong>
              </Text>
              {message && (
                <>
                  <Text className="mt-4 text-zinc-500">Message:</Text>
                  <Text className="text-zinc-500">{message}</Text>
                </>
              )}
              <Section className="mt-8 mb-8 text-center">
                <Button
                  className="rounded-md bg-zinc-950 px-6 py-3 text-base font-semibold text-zinc-50"
                  href={signingUrl}
                >
                  Sign Contract
                </Button>
              </Section>
              <Text className="m-0 text-sm text-zinc-400">
                If the button above doesn't work, you can copy and paste this
                link into your browser:
              </Text>
              <Text className="text-sm text-zinc-400">{signingUrl}</Text>
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

ContractTemplate.PreviewProps = {
  clientName: "Jane Smith",
  contractTitle: "Event Catering Contract - Wedding Reception",
  signingUrl: "https://example.com/contracts/abc123/sign",
  message:
    "Please review the attached contract and let us know if you have any questions.",
};

export default ContractTemplate;
