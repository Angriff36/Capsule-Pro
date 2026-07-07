"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
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
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createClientContact,
  deleteClientContact,
  getClientContacts,
  updateClientContact,
} from "../../../actions";

interface ClientContactData {
  email: string | null;
  first_name: string;
  id: string;
  isBillingContact: boolean;
  isPrimary: boolean;
  last_name: string;
  phone: string | null;
  title: string | null;
}

interface ContactsTabProps {
  client: { id: string };
}

const emptyForm = {
  first_name: "",
  last_name: "",
  title: "",
  email: "",
  phone: "",
  isPrimary: false,
  isBillingContact: false,
};

export function ContactsTab({ client }: ContactsTabProps) {
  const [contacts, setContacts] = useState<ClientContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<ClientContactData | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClientContacts(client.id);
      setContacts(
        data.map((c) => ({
          id: c.id,
          first_name: c.firstName,
          last_name: c.lastName,
          title: c.title,
          email: c.email,
          phone: c.phone,
          isPrimary: c.isPrimary,
          isBillingContact: c.isBillingContact,
        }))
      );
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleCreate = async (e: React.FormEvent) => {
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
      setCreateDialogOpen(false);
      setFormData({ ...emptyForm });
      fetchContacts();
    } catch (error) {
      toast.error("Failed to add contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) {
      return;
    }
    setSubmitting(true);
    try {
      await updateClientContact(client.id, selectedContact.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        title: formData.title || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        isPrimary: formData.isPrimary,
        isBillingContact: formData.isBillingContact,
      });
      toast.success("Contact updated successfully");
      setEditDialogOpen(false);
      setSelectedContact(null);
      setFormData({ ...emptyForm });
      fetchContacts();
    } catch (error) {
      toast.error("Failed to update contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteClientContact(client.id, selectedContact.id);
      toast.success("Contact removed successfully");
      setDeleteDialogOpen(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (error) {
      toast.error("Failed to remove contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (contact: ClientContactData) => {
    setSelectedContact(contact);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      isPrimary: contact.isPrimary,
      isBillingContact: contact.isBillingContact,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (contact: ClientContactData) => {
    setSelectedContact(contact);
    setDeleteDialogOpen(true);
  };

  const contactFormFields = (
    <div className="space-y-4">
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
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Event Manager"
          value={formData.title}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="contact@example.com"
          type="email"
          value={formData.email}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              setFormData({ ...formData, isPrimary: checked as boolean })
            }
          />
          <Label className="flex items-center gap-2" htmlFor="isPrimary">
            <StarIcon className="h-4 w-4" />
            Primary Contact
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={formData.isBillingContact}
            id="isBillingContact"
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isBillingContact: checked as boolean })
            }
          />
          <Label className="flex items-center gap-2" htmlFor="isBillingContact">
            <CreditCardIcon className="h-4 w-4" />
            Billing Contact
          </Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl">Contacts ({contacts.length})</h2>
        <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              {contactFormFields}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setCreateDialogOpen(false)}
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
        <div className="py-8 text-center text-muted-foreground">
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <Card tone="canvas">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No contacts yet</h3>
            <p className="mb-4 text-muted-foreground">
              Add contacts to this client to keep track of key people.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <Card key={contact.id} tone="canvas">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {contact.first_name} {contact.last_name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1">
                      {contact.isPrimary && (
                        <Badge className="text-xs" variant="secondary">
                          <StarIcon className="mr-1 h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                      {contact.isBillingContact && (
                        <Badge className="text-xs" variant="secondary">
                          <CreditCardIcon className="mr-1 h-3 w-3" />
                          Billing
                        </Badge>
                      )}
                    </div>
                    <Button
                      className="ml-1 h-7 w-7"
                      onClick={() => openEditDialog(contact)}
                      size="icon"
                      variant="ghost"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(contact)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {contact.title && (
                  <p className="text-muted-foreground text-sm">
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

      {/* Edit Dialog */}
      <Dialog onOpenChange={setEditDialogOpen} open={editDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            {contactFormFields}
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedContact(null);
                  setFormData({ ...emptyForm });
                }}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={submitting} type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedContact?.first_name}{" "}
              {selectedContact?.last_name} from this client&apos;s contacts?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedContact(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
              onClick={handleDelete}
            >
              {submitting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
