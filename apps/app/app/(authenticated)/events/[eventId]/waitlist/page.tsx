"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  Clock,
  ListOrdered,
  ArrowRightToLine,
  Plus,
  Loader2,
  ArrowLeft,
} from "lucide-react";

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

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  confirmed: { label: "Confirmed", variant: "default", color: "bg-green-100 text-green-800" },
  pending: { label: "Pending", variant: "secondary", color: "bg-yellow-100 text-yellow-800" },
  declined: { label: "Declined", variant: "destructive", color: "bg-red-100 text-red-800" },
  waitlisted: { label: "Waitlisted", variant: "outline", color: "bg-blue-100 text-blue-800" },
  tentative: { label: "Tentative", variant: "outline", color: "bg-orange-100 text-orange-800" },
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
      const res = await fetch(`/api/events/${eventId}/waitlist`);
      const json = await res.json();
      setGuests(json.data.guests);
      setSummary(json.data.summary);
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
      const res = await fetch(`/api/events/${eventId}/waitlist/commands/add-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: form.guestName.trim(),
          guestEmail: form.guestEmail.trim() || null,
          guestPhone: form.guestPhone.trim() || null,
          dietaryRestrictions: form.dietaryRestrictions.trim() ? form.dietaryRestrictions.split(",").map((s) => s.trim()) : [],
          specialMealRequired: form.specialMealRequired,
          specialMealNotes: form.specialMealNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add guest");

      const guest = json.data;
      if (guest.rsvp_status === "waitlisted") {
        toast.info(`${guest.guest_name} added to waitlist (position #${guest.waitlist_position})`);
      } else {
        toast.success(`${guest.guest_name} added as confirmed`);
      }

      setForm({ guestName: "", guestEmail: "", guestPhone: "", dietaryRestrictions: "", specialMealRequired: false, specialMealNotes: "" });
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
      const res = await fetch(`/api/events/${eventId}/waitlist/commands/update-rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update RSVP");

      if (json.autoPromoted) {
        toast.success(`Auto-promoted ${json.autoPromoted.guest_name} from waitlist!`);
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
      const res = await fetch(`/api/events/${eventId}/waitlist/commands/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to promote");

      toast.success(`${guestName} promoted to confirmed`);
      fetchGuests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote");
    } finally {
      setUpdating(null);
    }
  };

  const capacityPct = summary && summary.capacity ? Math.min(100, (summary.confirmed / summary.capacity) * 100) : 0;

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
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Guest Waitlist & RSVP</h1>
          <p className="text-sm text-muted-foreground">Manage guest RSVPs and waitlist for this event</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Guests</span>
                </div>
                <p className="text-2xl font-bold mt-1">{summary.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Confirmed</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-600">{summary.confirmed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-yellow-600">{summary.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Waitlisted</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-blue-600">{summary.waitlisted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ArrowRightToLine className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Spots Left</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {summary.capacity !== null ? summary.spotsRemaining : "Unlimited"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Capacity Bar */}
          {summary.capacity !== null && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{summary.confirmed} / {summary.capacity}</span>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Guests</CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                    value={form.guestName}
                    onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                    placeholder="Guest name"
                  />
                </div>
                <div>
                  <Label htmlFor="guestEmail">Email</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={form.guestEmail}
                    onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="guestPhone">Phone</Label>
                  <Input
                    id="guestPhone"
                    value={form.guestPhone}
                    onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                  <Input
                    id="dietaryRestrictions"
                    value={form.dietaryRestrictions}
                    onChange={(e) => setForm({ ...form, dietaryRestrictions: e.target.value })}
                    placeholder="Vegetarian, Gluten-free (comma separated)"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.specialMealRequired}
                    onCheckedChange={(checked) => setForm({ ...form, specialMealRequired: checked })}
                  />
                  <Label>Special Meal Required</Label>
                </div>
                {form.specialMealRequired && (
                  <div>
                    <Label htmlFor="specialMealNotes">Special Meal Notes</Label>
                    <Input
                      id="specialMealNotes"
                      value={form.specialMealNotes}
                      onChange={(e) => setForm({ ...form, specialMealNotes: e.target.value })}
                      placeholder="Describe special meal needs"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddGuest} disabled={adding}>
                    {adding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Add Guest
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!guests.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No guests yet. Add the first guest to get started.
            </p>
          ) : (
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
                  const cfg = STATUS_CONFIG[guest.rsvp_status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.guest_name}</TableCell>
                      <TableCell className="text-muted-foreground">{guest.guest_email || "—"}</TableCell>
                      <TableCell>
                        {updating === guest.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Select
                            value={guest.rsvp_status}
                            onValueChange={(val) => handleUpdateRSVP(guest.id, val)}
                          >
                            <SelectTrigger className={`w-32 h-8 ${cfg.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="tentative">Tentative</SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                              {guest.rsvp_status === "waitlisted" && (
                                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {guest.waitlist_position !== null ? (
                          <Badge variant="outline" className="text-blue-600">
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
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromote(guest.id, guest.guest_name)}
                            disabled={updating === guest.id}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
