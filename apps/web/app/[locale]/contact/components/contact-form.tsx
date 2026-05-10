"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { cn } from "@repo/design-system/lib/utils";
import type { Dictionary } from "@repo/internationalization";
import { Check, MoveRight } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { contact } from "../actions/contact";

interface ContactFormProps {
  dictionary: Dictionary;
}

type FormState = "idle" | "loading" | "success" | "error";

export const ContactForm = ({ dictionary }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState("loading");
    setErrorMessage("");

    startTransition(async () => {
      const result = await contact(name, email, message);

      if (result.error) {
        setFormState("error");
        setErrorMessage(result.error);
        return;
      }

      setFormState("success");
      setName("");
      setEmail("");
      setMessage("");
    });
  };

  const renderBenefits = () =>
    dictionary.web.contact.hero.benefits.map((benefit) => (
      <div
        className="flex flex-row items-start gap-6 text-left"
        key={benefit.title}
      >
        <Check className="mt-2 h-4 w-4 text-primary" />
        <div className="flex flex-col gap-1">
          <p>{benefit.title}</p>
          <p className="text-muted-foreground text-sm">{benefit.description}</p>
        </div>
      </div>
    ));

  if (formState === "success") {
    return (
      <div className="w-full py-20 lg:py-40">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h4 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
                    {dictionary.web.contact.meta.title}
                  </h4>
                  <p className="max-w-sm text-left text-lg text-muted-foreground leading-relaxed tracking-tight">
                    {dictionary.web.contact.meta.description}
                  </p>
                </div>
              </div>
              {renderBenefits()}
            </div>

            <div className="flex items-center justify-center">
              <div className="flex max-w-sm flex-col items-center gap-4 rounded-md border p-8 text-center">
                <Check className="h-8 w-8 text-primary" />
                <p className="text-lg font-medium">
                  Thank you for reaching out! We&apos;ll get back to you soon.
                </p>
                <Button
                  className="w-full gap-4"
                  onClick={() => setFormState("idle")}
                  type="button"
                  variant="outline"
                >
                  Send another message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h4 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
                  {dictionary.web.contact.meta.title}
                </h4>
                <p className="max-w-sm text-left text-lg text-muted-foreground leading-relaxed tracking-tight">
                  {dictionary.web.contact.meta.description}
                </p>
              </div>
            </div>
            {renderBenefits()}
          </div>

          <div className="flex items-center justify-center">
            <form
              className={cn(
                "flex max-w-sm flex-col gap-4 rounded-md border p-8",
                isPending && "pointer-events-none opacity-70"
              )}
              onSubmit={handleSubmit}
            >
              <p>{dictionary.web.contact.hero.form.title}</p>
              <div className="grid w-full max-w-sm items-center gap-1">
                <Label htmlFor="contact-name">
                  {dictionary.web.contact.hero.form.firstName}
                </Label>
                <Input
                  id="contact-name"
                  onChange={(e) => setName(e.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1">
                <Label htmlFor="contact-message">Message</Label>
                <textarea
                  className="border-input bg-background flex min-h-[120px] w-full max-w-sm rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  id="contact-message"
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  value={message}
                />
              </div>

              {formState === "error" && errorMessage && (
                <p className="text-destructive text-sm">{errorMessage}</p>
              )}

              <Button
                className="w-full gap-4"
                disabled={isPending}
                type="submit"
              >
                {isPending
                  ? "Sending..."
                  : dictionary.web.contact.hero.form.cta}
                <MoveRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
