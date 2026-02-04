"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  PrinterIcon,
  SaveIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface StaffMember {
  name: string;
  role: string;
  shiftStart: string;
  shiftEnd: string;
  station: string;
}

interface TimelineItem {
  time: string;
  item: string;
  team: string;
  location: string;
  style: string;
  notes: string;
  hl: boolean;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

interface Layout {
  type: string;
  instructions: string;
  linkedMapImage?: string;
}

interface BoardMeta {
  eventName: string;
  eventNumber: string;
  eventDate: string;
  staffRestrooms: string;
  staffParking: string;
  lastUpdatedISO?: string;
}

interface BoardData {
  schema?: string;
  version?: string;
  meta: BoardMeta;
  staff: StaffMember[];
  timeline: TimelineItem[];
  layouts: Layout[];
  attachments?: Attachment[];
}

interface BattleBoardEditorProps {
  board: {
    id: string;
    boardName: string;
    boardType: string;
    status: string;
    boardData: Record<string, unknown>;
    notes: string | null;
    isTemplate: boolean;
    createdAt: string;
    updatedAt: string;
  };
  event: {
    id: string;
    eventNumber: string | null;
    title: string;
    eventDate: string;
    venueName: string | null;
    venueAddress: string | null;
    guestCount: number;
  } | null;
}

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "published", label: "Published" },
];

const styleOptions = [
  { value: "setup", label: "Setup", color: "bg-blue-100 text-blue-800" },
  { value: "service", label: "Service", color: "bg-green-100 text-green-800" },
  {
    value: "breakdown",
    label: "Breakdown",
    color: "bg-orange-100 text-orange-800",
  },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
];

export function BattleBoardEditorClient({
  board,
  event,
}: BattleBoardEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [boardData, setBoardData] = useState<BoardData>(
    board.boardData as BoardData
  );
  const [status, setStatus] = useState(board.status);
  const [boardName, setBoardName] = useState(board.boardName);

  // Update meta field
  const updateMeta = useCallback((field: keyof BoardMeta, value: string) => {
    setBoardData((prev) => ({
      ...prev,
      meta: { ...prev.meta, [field]: value },
    }));
  }, []);

  // Add staff member
  const addStaffMember = useCallback(() => {
    setBoardData((prev) => ({
      ...prev,
      staff: [
        ...prev.staff,
        {
          name: "",
          role: "Staff",
          shiftStart: "",
          shiftEnd: "",
          station: "TBD",
        },
      ],
    }));
  }, []);

  // Update staff member
  const updateStaffMember = useCallback(
    (index: number, field: keyof StaffMember, value: string) => {
      setBoardData((prev) => ({
        ...prev,
        staff: prev.staff.map((s, i) =>
          i === index ? { ...s, [field]: value } : s
        ),
      }));
    },
    []
  );

  // Remove staff member
  const removeStaffMember = useCallback((index: number) => {
    setBoardData((prev) => ({
      ...prev,
      staff: prev.staff.filter((_, i) => i !== index),
    }));
  }, []);

  // Add timeline item
  const addTimelineItem = useCallback(() => {
    setBoardData((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        {
          time: "",
          item: "",
          team: "TBD",
          location: "Main Hall",
          style: "other",
          notes: "",
          hl: false,
        },
      ],
    }));
  }, []);

  // Update timeline item
  const updateTimelineItem = useCallback(
    (index: number, field: keyof TimelineItem, value: string | boolean) => {
      setBoardData((prev) => ({
        ...prev,
        timeline: prev.timeline.map((t, i) =>
          i === index ? { ...t, [field]: value } : t
        ),
      }));
    },
    []
  );

  // Remove timeline item
  const removeTimelineItem = useCallback((index: number) => {
    setBoardData((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((_, i) => i !== index),
    }));
  }, []);

  // Save board
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/events/battle-boards/${board.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardData,
          boardName,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save battle board");
      }

      toast.success("Battle board saved successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to save battle board");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Print board
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            className="text-lg font-semibold w-auto min-w-[300px]"
            onChange={(e) => setBoardName(e.target.value)}
            value={boardName}
          />
          <Select onValueChange={setStatus} value={status}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="outline">
            <PrinterIcon className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button disabled={isSaving} onClick={handleSave}>
            <SaveIcon className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Event info banner */}
      {event && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(event.eventDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{event.guestCount} guests</span>
                </div>
                {event.venueName && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{event.venueName}</span>
                  </div>
                )}
              </div>
              {event.eventNumber && (
                <Badge variant="outline">#{event.eventNumber}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      <Tabs className="space-y-4" defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">
            <UsersIcon className="mr-2 h-4 w-4" />
            Staff ({boardData.staff?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <ClockIcon className="mr-2 h-4 w-4" />
            Timeline ({boardData.timeline?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Staff Tab */}
        <TabsContent className="space-y-4" value="staff">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Assignments</CardTitle>
                <CardDescription>
                  Manage staff positions and shift times
                </CardDescription>
              </div>
              <Button onClick={addStaffMember} size="sm">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </CardHeader>
            <CardContent>
              {boardData.staff && boardData.staff.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Shift Start</TableHead>
                      <TableHead>Shift End</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boardData.staff.map((member, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            onChange={(e) =>
                              updateStaffMember(index, "name", e.target.value)
                            }
                            placeholder="Staff name"
                            value={member.name}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(e) =>
                              updateStaffMember(index, "role", e.target.value)
                            }
                            placeholder="Role"
                            value={member.role}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(e) =>
                              updateStaffMember(
                                index,
                                "shiftStart",
                                e.target.value
                              )
                            }
                            placeholder="3:00 PM"
                            value={member.shiftStart}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(e) =>
                              updateStaffMember(
                                index,
                                "shiftEnd",
                                e.target.value
                              )
                            }
                            placeholder="11:00 PM"
                            value={member.shiftEnd}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(e) =>
                              updateStaffMember(
                                index,
                                "station",
                                e.target.value
                              )
                            }
                            placeholder="Station"
                            value={member.station}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => removeStaffMember(index)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2Icon className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UsersIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No staff assigned yet</p>
                  <Button
                    className="mt-4"
                    onClick={addStaffMember}
                    variant="outline"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add First Staff Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent className="space-y-4" value="timeline">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Event Timeline</CardTitle>
                <CardDescription>
                  Schedule of activities and responsibilities
                </CardDescription>
              </div>
              <Button onClick={addTimelineItem} size="sm">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {boardData.timeline && boardData.timeline.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="w-[120px]">Style</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boardData.timeline.map((item, index) => (
                      <TableRow
                        className={item.hl ? "bg-yellow-50" : ""}
                        key={index}
                      >
                        <TableCell>
                          <Input
                            className="w-[90px]"
                            onChange={(e) =>
                              updateTimelineItem(index, "time", e.target.value)
                            }
                            placeholder="3:00 PM"
                            value={item.time}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(e) =>
                              updateTimelineItem(index, "item", e.target.value)
                            }
                            placeholder="Activity description"
                            value={item.item}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-[120px]"
                            onChange={(e) =>
                              updateTimelineItem(index, "team", e.target.value)
                            }
                            placeholder="Team"
                            value={item.team}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-[120px]"
                            onChange={(e) =>
                              updateTimelineItem(
                                index,
                                "location",
                                e.target.value
                              )
                            }
                            placeholder="Location"
                            value={item.location}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(v) =>
                              updateTimelineItem(index, "style", v)
                            }
                            value={item.style}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {styleOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => removeTimelineItem(index)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2Icon className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No timeline items yet</p>
                  <Button
                    className="mt-4"
                    onClick={addTimelineItem}
                    variant="outline"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add First Timeline Item
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent className="space-y-4" value="details">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Name</Label>
                  <Input
                    onChange={(e) => updateMeta("eventName", e.target.value)}
                    value={boardData.meta?.eventName || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Number</Label>
                  <Input
                    onChange={(e) => updateMeta("eventNumber", e.target.value)}
                    value={boardData.meta?.eventNumber || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Date</Label>
                  <Input
                    onChange={(e) => updateMeta("eventDate", e.target.value)}
                    placeholder="YYYY-MM-DD"
                    value={boardData.meta?.eventDate || ""}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staff Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Staff Restrooms</Label>
                  <Input
                    onChange={(e) =>
                      updateMeta("staffRestrooms", e.target.value)
                    }
                    placeholder="Location of staff restrooms"
                    value={boardData.meta?.staffRestrooms || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Staff Parking</Label>
                  <Input
                    onChange={(e) => updateMeta("staffParking", e.target.value)}
                    placeholder="Parking instructions"
                    value={boardData.meta?.staffParking || ""}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Layouts */}
          <Card>
            <CardHeader>
              <CardTitle>Layouts & Instructions</CardTitle>
              <CardDescription>
                Venue layouts and setup instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {boardData.layouts?.map((layout, index) => (
                <div className="border rounded-lg p-4 space-y-2" key={index}>
                  <Label className="font-medium">{layout.type}</Label>
                  <Textarea
                    onChange={(e) => {
                      setBoardData((prev) => ({
                        ...prev,
                        layouts: prev.layouts.map((l, i) =>
                          i === index
                            ? { ...l, instructions: e.target.value }
                            : l
                        ),
                      }));
                    }}
                    placeholder="Layout instructions..."
                    rows={3}
                    value={layout.instructions}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
