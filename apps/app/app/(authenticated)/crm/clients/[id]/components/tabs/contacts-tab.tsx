"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  CreditCardIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClientContact, getClientContacts } from "../../../../actions";

interface ContactsTabProps {
  client: {
    id: string;
  };
}

export function ContactsTab({ client }: ContactsTabProps) {
  const [contacts, setContacts] = useState<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      title: string | null;
      email: string | null;
      phone: string | null;
      isPrimary: boolean;
      isBillingContact: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    title: "",
    email: "",
    phone: "",
    isPrimary: false,
    isBillingContact: false,
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await getClientContacts(client.id);
      setContacts(data);
    } catch (error) {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [client.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createClientContact(client.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        title: formData.title || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        isPrimary: formData.isPrimary,
        isBillingContact: formData.isBillingContact,
      });
      toast.success("Contact added successfully");
      setDialogOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        title: "",
        email: "",
        phone: "",
        isPrimary: false,
        isBillingContact: false,
      });
      fetchContacts();
    } catch (error) {
      toast.error("Failed to add contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contacts ({contacts.length})</h2>
        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                    value={formData.first_name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                    value={formData.last_name}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Event Manager"
                  value={formData.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contact@example.com"
                  type="email"
                  value={formData.email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  type="tel"
                  value={formData.phone}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.isPrimary}
                    id="isPrimary"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        isPrimary: checked as boolean,
                      })
                    }
                  />
                  <Label
                    className="flex items-center gap-2"
                    htmlFor="isPrimary"
                  >
                    <StarIcon className="h-4 w-4" />
                    Primary Contact
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.isBillingContact}
                    id="isBillingContact"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        isBillingContact: checked as boolean,
                      })
                    }
                  />
                  <Label
                    className="flex items-center gap-2"
                    htmlFor="isBillingContact"
                  >
                    <CreditCardIcon className="h-4 w-4" />
                    Billing Contact
                  </Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setDialogOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={submitting} type="submit">
                  Add Contact
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
            <p className="text-muted-foreground mb-4">
              Add contacts to this client to keep track of key people.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {contact.first_name} {contact.last_name}
                  </CardTitle>
                  <div className="flex gap-1">
                    {contact.isPrimary && (
                      <Badge className="text-xs" variant="secondary">
                        <StarIcon className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                    {contact.isBillingContact && (
                      <Badge className="text-xs" variant="secondary">
                        <CreditCardIcon className="h-3 w-3 mr-1" />
                        Billing
                      </Badge>
                    )}
                  </div>
                </div>
                {contact.title && (
                  <p className="text-sm text-muted-foreground">
                    {contact.title}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      className="hover:underline"
                      href={`mailto:${contact.email}`}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      className="hover:underline"
                      href={`tel:${contact.phone}`}
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
