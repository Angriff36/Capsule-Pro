import type { Metadata } from "next";
type ContactProps = {
  params: Promise<{
    locale: string;
  }>;
};
export declare const generateMetadata: ({
  params,
}: ContactProps) => Promise<Metadata>;
declare const Contact: ({
  params,
}: ContactProps) => Promise<import("react").JSX.Element>;
export default Contact;
//# sourceMappingURL=page.d.ts.map
