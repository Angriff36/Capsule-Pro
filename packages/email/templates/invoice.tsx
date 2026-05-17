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
import type React from "react";

export interface InvoiceTemplateProps {
  readonly clientName: string;
  readonly invoiceNumber: string;
  readonly amountDue: string;
  readonly currency: string;
  readonly dueDate?: string;
  readonly paymentUrl: string;
  readonly notes?: string;
}

const formatCurrency = (amount: string, currency: string): string => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `${amount} ${currency}`;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(2)} ${currency}`;
  }
};

export const InvoiceTemplate = ({
  clientName,
  invoiceNumber,
  amountDue,
  currency,
  dueDate,
  paymentUrl,
  notes,
}: InvoiceTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>
        Invoice {invoiceNumber} — {formatCurrency(amountDue, currency)} due
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
                Your invoice is ready. The balance due is{" "}
                <strong>{formatCurrency(amountDue, currency)}</strong>
                {dueDate ? (
                  <>
                    , payable by <strong>{dueDate}</strong>
                  </>
                ) : null}
                .
              </Text>
              {notes ? (
                <>
                  <Text className="mt-4 text-zinc-500">Notes:</Text>
                  <Text className="text-zinc-500">{notes}</Text>
                </>
              ) : null}
              <Section className="mt-8 mb-8 text-center">
                <Button
                  className="rounded-md bg-zinc-950 px-6 py-3 font-semibold text-base text-zinc-50"
                  href={paymentUrl}
                >
                  View &amp; Pay Invoice
                </Button>
              </Section>
              <Text className="m-0 text-sm text-zinc-400">
                If the button above doesn't work, you can copy and paste this
                link into your browser:
              </Text>
              <Text className="text-sm text-zinc-400">{paymentUrl}</Text>
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

(
  InvoiceTemplate as React.FC<InvoiceTemplateProps> & {
    PreviewProps: InvoiceTemplateProps;
  }
).PreviewProps = {
  clientName: "Jane Smith",
  invoiceNumber: "INV-2026-0001",
  amountDue: "1250.00",
  currency: "USD",
  dueDate: "May 15, 2026",
  paymentUrl: "https://app.capsule.pro/invoices/abc123",
  notes: "Thank you for your business. Please remit payment by the due date.",
};

export default InvoiceTemplate;
