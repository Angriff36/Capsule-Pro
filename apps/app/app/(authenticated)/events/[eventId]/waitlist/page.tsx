"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  ArrowLeft,
  ArrowRightToLine,
  Clock,
  ListOrdered,
  Loader2,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listEventWaitlistEntries,
  eventWaitlistEntryAddGuest,
  eventWaitlistEntryUpdateRsvp,
  eventWaitlistEntryPromote,
} from "@/app/lib/manifest-client.generated";

interface Guest {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  rsvp_status: string;
  waitlist_position: number | null;
  rsvp_responded_at: string | null;
  created_at: string;
}

interface Summary {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  tentative: number;
  waitlisted: number;
  capacity: number | null;
  spotsRemaining: number | null;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
  }
> = {
  confirmed: {
    label: "Confirmed",
    variant: "default",
    color: "bg-muted/50 text-foreground",
  },
  pending: {
    label: "Pending",
    variant: "secondary",
    color: "bg-muted/50 text-foreground",
  },
  declined: {
    label: "Declined",
    variant: "destructive",
    color: "bg-muted/50 text-foreground",
  },
  waitlisted: {
    label: "Waitlisted",
    variant: "outline",
    color: "bg-muted/50 text-foreground",
  },
  tentative: {
    label: "Tentative",
    variant: "outline",
    color: "bg-muted/50 text-foreground",
  },
};

export default function WaitlistPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = (params?.eventId ?? "") as string;

  const [guests, setGuests] = useState<Guest[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Add guest form
  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    dietaryRestrictions: "",
    specialMealRequired: false,
    specialMealNotes: "",
  });

  const fetchGuests = useCallback(async () => {
    try {
      const result = await listEventWaitlistEntries({ eventId });
      const guestList = result.data as unknown as Guest[];
      setGuests(guestList);
      // Compute summary from the returned guest list
      const confirmed = guestList.filter((g) => g.rsvp_status === "confirmed").length;
      const pending = guestList.filter((g) => g.rsvp_status === "pending").length;
      const declined = guestList.filter((g) => g.rsvp_status === "declined").length;
      const tentative = guestList.filter((g) => g.rsvp_status === "tentative").length;
      const waitlisted = guestList.filter((g) => g.rsvp_status === "waitlisted").length;
      setSummary({
        total: guestList.length,
        confirmed,
        pending,
        declined,
        tentative,
        waitlisted,
        capacity: null,
        spotsRemaining: null,
      });
    } catch {
      toast.error("Failed to load waitlist");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleAddGuest = async () => {
    if (!form.guestName.trim()) {
      toast.error("Guest name is required");
      return;
    }
    setAdding(true);
    try {
      const result = await eventWaitlistEntryAddGuest({
        eventId,
        guestName: form.guestName.trim(),
      });

      const guest = result as Record<string, unknown> | undefined;
      if (guest && guest.rsvp_status === "waitlisted") {
        toast.info(
          `${guest.guest_name} added to waitlist (position #${guest.waitlist_position})`
        );
      } else {
        toast.success(`${form.guestName.trim()} added as confirmed`);
      }

      setForm({
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        dietaryRestrictions: "",
        specialMealRequired: false,
        specialMealNotes: "",
      });
      setAddOpen(false);
      fetchGuests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add guest");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRSVP = async (guestId: string, status: string) => {
    setUpdating(guestId);
    try {
      const result = await eventWaitlistEntryUpdateRsvp({ id: guestId, status });

      const promoted = (result as Record<string, unknown> | undefined)?.autoPromoted as Record<string, unknown> | undefined;
      if (promoted) {
        toast.success(
          `Auto-promoted ${promoted.guest_name} from waitlist!`
        );
      }
      fetchGuests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update RSVP");
    } finally {
      setUpdating(null);
    }
  };

  const handlePromote = async (guestId: string, guestName: string) => {
    setUpdating(guestId);
    try {
      await eventWaitlistEntryPromote({ id: guestId });
      toast.success(`${guestName} promoted to confirmed`);
      fetchGuests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote");
    } finally {
      setUpdating(null);
    }
  };

  const capacityPct =
    summary && summary.capacity
      ? Math.min(100, (summary.confirmed / summary.capacity) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} size="sm" variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Guest Waitlist & RSVP</h1>
          <p className="text-sm text-muted-foreground">
            Manage guest RSVPs and waitlist for this event
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card tone="soft-stone">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Total Guests
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1">{summary.total}</p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">
                    Confirmed
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1 text-green-600">
                  {summary.confirmed}
                </p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-semibold mt-1 text-yellow-600">
                  {summary.pending}
                </p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">
                    Waitlisted
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1 text-blue-600">
                  {summary.waitlisted}
                </p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ArrowRightToLine className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Spots Left
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1">
                  {summary.capacity !== null
                    ? summary.spotsRemaining
                    : "Unlimited"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Capacity Bar */}
          {summary.capacity !== null && (
            <Card tone="canvas">
              <CardContent className="pt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">
                    {summary.confirmed} / {summary.capacity}
                  </span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${capacityPct >= 100 ? "bg-red-500" : capacityPct >= 80 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Guest Table */}
      <Card tone="canvas">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Guests</CardTitle>
          <Dialog onOpenChange={setAddOpen} open={addOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Guest
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Guest</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="guestName">Name *</Label>
                  <Input
                    id="guestName"
                    onChange={(e) =>
                      setForm({ ...form, guestName: e.target.value })
                    }
                    placeholder="Guest name"
                    value={form.guestName}
                  />
                </div>
                <div>
                  <Label htmlFor="guestEmail">Email</Label>
                  <Input
                    id="guestEmail"
                    onChange={(e) =>
                      setForm({ ...form, guestEmail: e.target.value })
                    }
                    placeholder="email@example.com"
                    type="email"
                    value={form.guestEmail}
                  />
                </div>
                <div>
                  <Label htmlFor="guestPhone">Phone</Label>
                  <Input
                    id="guestPhone"
                    onChange={(e) =>
                      setForm({ ...form, guestPhone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    value={form.guestPhone}
                  />
                </div>
                <div>
                  <Label htmlFor="dietaryRestrictions">
                    Dietary Restrictions
                  </Label>
                  <Input
                    id="dietaryRestrictions"
                    onChange={(e) =>
                      setForm({ ...form, dietaryRestrictions: e.target.value })
                    }
                    placeholder="Vegetarian, Gluten-free (comma separated)"
                    value={form.dietaryRestrictions}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.specialMealRequired}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, specialMealRequired: checked })
                    }
                  />
                  <Label>Special Meal Required</Label>
                </div>
                {form.specialMealRequired && (
                  <div>
                    <Label htmlFor="specialMealNotes">Special Meal Notes</Label>
                    <Input
                      id="specialMealNotes"
                      onChange={(e) =>
                        setForm({ ...form, specialMealNotes: e.target.value })
                      }
                      placeholder="Describe special meal needs"
                      value={form.specialMealNotes}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button onClick={() => setAddOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button disabled={adding} onClick={handleAddGuest}>
                    {adding && (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    )}
                    Add Guest
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {guests.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>RSVP Status</TableHead>
                  <TableHead className="text-center">Waitlist #</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => {
                  const cfg =
                    STATUS_CONFIG[guest.rsvp_status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">
                        {guest.guest_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {guest.guest_email || "—"}
                      </TableCell>
                      <TableCell>
                        {updating === guest.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Select
                            onValueChange={(val) =>
                              handleUpdateRSVP(guest.id, val)
                            }
                            value={guest.rsvp_status}
                          >
                            <SelectTrigger className={`w-32 h-8 ${cfg.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">
                                Confirmed
                              </SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="tentative">
                                Tentative
                              </SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                              {guest.rsvp_status === "waitlisted" && (
                                <SelectItem value="waitlisted">
                                  Waitlisted
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {guest.waitlist_position !== null ? (
                          <Badge className="text-blue-600" variant="outline">
                            #{guest.waitlist_position}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(guest.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {guest.rsvp_status === "waitlisted" && (
                          <Button
                            disabled={updating === guest.id}
                            onClick={() =>
                              handlePromote(guest.id, guest.guest_name)
                            }
                            size="sm"
                            variant="outline"
                          >
                            {updating === guest.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Promote"
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No guests yet. Add the first guest to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
