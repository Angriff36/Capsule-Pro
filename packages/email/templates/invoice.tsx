import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type React from "react";

export interface InvoiceTemplateProps {
  readonly clientName: string;
  readonly invoiceNumber: string;
  readonly total: string;
  readonly amountDue: string;
  readonly dueDate: string;
  readonly viewUrl: string;
  readonly message?: string;
  readonly companyName?: string;
}

export const InvoiceTemplate = ({
  clientName,
  invoiceNumber,
  total,
  amountDue,
  dueDate,
  viewUrl,
  message,
  companyName,
}: InvoiceTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>
        Invoice {invoiceNumber} — {amountDue} due by {dueDate}
      </Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                Invoice {invoiceNumber}
              </Text>
              <Text className="m-0 text-zinc-500">Dear {clientName},</Text>
              <Text className="mt-4 text-zinc-500">
                {companyName
                  ? `${companyName} has issued a new invoice for your records.`
                  : "A new invoice has been issued for your records."}
              </Text>

              <Section className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <Row>
                  <Text className="m-0 text-sm text-zinc-500">
                    Invoice number
                  </Text>
                  <Text className="m-0 font-semibold text-zinc-900">
                    {invoiceNumber}
                  </Text>
                </Row>
                <Hr className="my-3 border-zinc-200" />
                <Row>
                  <Text className="m-0 text-sm text-zinc-500">Total</Text>
                  <Text className="m-0 font-semibold text-zinc-900">
                    {total}
                  </Text>
                </Row>
                <Hr className="my-3 border-zinc-200" />
                <Row>
                  <Text className="m-0 text-sm text-zinc-500">Amount due</Text>
                  <Text className="m-0 font-semibold text-zinc-900">
                    {amountDue}
                  </Text>
                </Row>
                <Hr className="my-3 border-zinc-200" />
                <Row>
                  <Text className="m-0 text-sm text-zinc-500">Due by</Text>
                  <Text className="m-0 font-semibold text-zinc-900">
                    {dueDate}
                  </Text>
                </Row>
              </Section>

              {message && (
                <>
                  <Text className="mt-6 text-zinc-500">Message:</Text>
                  <Text className="text-zinc-500">{message}</Text>
                </>
              )}

              <Section className="mt-8 mb-8 text-center">
                <Button
                  className="rounded-md bg-zinc-950 px-6 py-3 font-semibold text-base text-zinc-50"
                  href={viewUrl}
                >
                  View Invoice
                </Button>
              </Section>
              <Text className="m-0 text-sm text-zinc-400">
                If the button above doesn't work, paste this link into your
                browser:
              </Text>
              <Text className="text-sm text-zinc-400">{viewUrl}</Text>
              <Hr className="my-6 border-zinc-200" />
              <Text className="m-0 text-sm text-zinc-400">
                This is an automated message. Please do not reply to this
                email.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

(
  InvoiceTemplate as React.FC<InvoiceTemplateProps> & {
    PreviewProps: InvoiceTemplateProps;
  }
).PreviewProps = {
  clientName: "Jane Smith",
  invoiceNumber: "INV-2026-0001",
  total: "$2,450.00",
  amountDue: "$2,450.00",
  dueDate: "May 15, 2026",
  viewUrl: "https://example.com/invoices/abc123",
  message:
    "Thank you for your business. Please remit payment by the due date.",
  companyName: "Convoy Catering",
};

export default InvoiceTemplate;
