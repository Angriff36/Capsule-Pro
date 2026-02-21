"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { captureException } from "@sentry/nextjs";
import { differenceInMinutes, format } from "date-fns";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Coffee,
  MapPin,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/app/(authenticated)/components/header";
import { apiFetch } from "@/app/lib/api";

// Types
interface Employee {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  phone: string | null;
  hourly_rate: number | null;
}

interface ActiveTimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  location_id: string | null;
  location_name: string | null;
  shift_id: string | null;
  notes: string | null;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
}

interface StatusResponse {
  employee: Employee;
  activeTimeEntry: ActiveTimeEntry | null;
}

interface OfflineQueueItem {
  action: "clockIn" | "clockOut" | "startBreak" | "endBreak";
  timestamp: string;
  data: Record<string, unknown>;
  location?: GeolocationCoordinates | null;
  photoDataUrl?: string;
}

function formatDuration(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const diffMinutes = differenceInMinutes(now, start);

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function formatTime(date: string | Date): string {
  return format(new Date(date), "h:mm a");
}

export default function MobileTimeClockPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeTimeEntry, setActiveTimeEntry] =
    useState<ActiveTimeEntry | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockedInDuration, setClockedInDuration] = useState("0h 0m");
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);

  // Clock in state
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] =
    useState<GeolocationCoordinates | null>(null);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);

  // Break state
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<string | null>(null);

  // Dialogs
  const [showClockInDialog, setShowClockInDialog] = useState(false);
  const [showLocationOverrideDialog, setShowLocationOverrideDialog] =
    useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/api/timecards/me");
      if (response.ok) {
        const data: StatusResponse = await response.json();
        setEmployee(data.employee);
        setActiveTimeEntry(data.activeTimeEntry);
        if (data.activeTimeEntry) {
          setIsOnBreak(false); // Would need additional field for break state
        }
      } else {
        const errData = await response.json();
        setError(errData.error || "Failed to load status");
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileTimeClock] Failed to fetch status:", err);
      setError("Failed to load status");
    }
  }, []);

  // Fetch locations for clock-in selection
  const fetchLocations = useCallback(async () => {
    try {
      const response = await apiFetch("/api/locations?isActive=true");
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
        if (data.locations?.length > 0) {
          setSelectedLocationId(data.locations[0].id);
        }
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileTimeClock] Failed to fetch locations:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchLocations();
  }, [fetchStatus, fetchLocations]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update clocked-in duration every minute
  useEffect(() => {
    if (activeTimeEntry) {
      const updateDuration = () => {
        setClockedInDuration(formatDuration(activeTimeEntry.clock_in));
      };
      updateDuration();
      durationIntervalRef.current = setInterval(updateDuration, 60_000);
    } else {
      setClockedInDuration("0h 0m");
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [activeTimeEntry]);

  // Sync offline queue when coming back online
  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0) {
      return;
    }

    const syncOfflineActions = async () => {
      const failedItems: OfflineQueueItem[] = [];

      for (const item of offlineQueue) {
        try {
          if (item.action === "clockIn") {
            const response = await apiFetch(
              "/api/timecards/entries/commands/clock-in",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.data),
              }
            );
            if (!response.ok) {
              failedItems.push(item);
            }
          } else if (item.action === "clockOut" && activeTimeEntry) {
            const response = await apiFetch(
              `/api/timecards/${activeTimeEntry.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.data),
              }
            );
            if (!response.ok) {
              failedItems.push(item);
            }
          }
        } catch {
          failedItems.push(item);
        }
      }

      if (failedItems.length === 0) {
        setOfflineQueue([]);
        toast.success("Offline actions synced successfully");
        await fetchStatus();
      } else {
        setOfflineQueue(failedItems);
        toast.error(
          `Failed to sync ${failedItems.length} action(s). Will retry.`
        );
      }
    };

    syncOfflineActions();
  }, [isOnline, offlineQueue, activeTimeEntry, fetchStatus]);

  // Get current geolocation
  const getCurrentLocation =
    useCallback((): Promise<GeolocationCoordinates | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(position.coords);
          },
          () => {
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10_000 }
        );
      });
    }, []);

  // Handle photo capture
  const handlePhotoCapture = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoDataUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Reset clock in form
  const resetClockInForm = useCallback(() => {
    setNotes("");
    setPhotoDataUrl(null);
    setLocationWarning(null);
    setCurrentLocation(null);
  }, []);

  // Handle clock in
  const handleClockIn = useCallback(async () => {
    if (!employee) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Get current location
    const geoLocation = await getCurrentLocation();

    const clockInData: Record<string, unknown> = {
      employeeId: employee.id,
      locationId: selectedLocationId || null,
      notes: notes || null,
      clockInTime: new Date().toISOString(),
      // Store location data for verification
      geolocation: geoLocation
        ? {
            latitude: geoLocation.latitude,
            longitude: geoLocation.longitude,
            accuracy: geoLocation.accuracy,
          }
        : null,
      // Store photo verification
      photoVerification: photoDataUrl,
    };

    // If offline, queue the action
    if (!isOnline) {
      setOfflineQueue((prev) => [
        ...prev,
        {
          action: "clockIn",
          timestamp: new Date().toISOString(),
          data: clockInData,
          location: geoLocation,
          photoDataUrl: photoDataUrl || undefined,
        },
      ]);
      toast.info("Clock in queued - will sync when online");
      setIsLoading(false);
      setShowClockInDialog(false);
      resetClockInForm();
      return;
    }

    try {
      const response = await apiFetch(
        "/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clockInData),
        }
      );

      if (response.ok) {
        toast.success("Clocked in successfully");
        await fetchStatus();
        setShowClockInDialog(false);
        resetClockInForm();
      } else {
        const errData = await response.json();
        setError(errData.message || "Failed to clock in");
        toast.error("Failed to clock in");
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileTimeClock] Clock in failed:", err);
      setError("Failed to clock in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    employee,
    selectedLocationId,
    notes,
    photoDataUrl,
    isOnline,
    getCurrentLocation,
    fetchStatus,
    resetClockInForm,
  ]);

  // Handle clock out
  const handleClockOut = useCallback(async () => {
    if (!activeTimeEntry) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Get current location
    const geoLocation = await getCurrentLocation();

    const clockOutData: Record<string, unknown> = {
      id: activeTimeEntry.id,
      clockOutTime: new Date().toISOString(),
      // Store location data for verification
      geolocation: geoLocation
        ? {
            latitude: geoLocation.latitude,
            longitude: geoLocation.longitude,
            accuracy: geoLocation.accuracy,
          }
        : null,
    };

    // If offline, queue the action
    if (!isOnline) {
      setOfflineQueue((prev) => [
        ...prev,
        {
          action: "clockOut",
          timestamp: new Date().toISOString(),
          data: clockOutData,
          location: geoLocation,
        },
      ]);
      toast.info("Clock out queued - will sync when online");
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetch(`/api/timecards/${activeTimeEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clockOutData),
      });

      if (response.ok) {
        toast.success("Clocked out successfully");
        await fetchStatus();
      } else {
        const errData = await response.json();
        setError(errData.message || "Failed to clock out");
        toast.error("Failed to clock out");
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileTimeClock] Clock out failed:", err);
      setError("Failed to clock out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTimeEntry, isOnline, getCurrentLocation, fetchStatus]);

  // Handle break start/end
  const handleBreakToggle = useCallback(async () => {
    if (!activeTimeEntry) {
      return;
    }

    setIsLoading(true);

    if (isOnBreak) {
      // End break
      const breakEndTime = new Date();
      const breakDuration = breakStartTime
        ? differenceInMinutes(breakEndTime, new Date(breakStartTime))
        : 0;

      const newBreakMinutes = activeTimeEntry.break_minutes + breakDuration;

      try {
        const response = await apiFetch(
          `/api/timecards/${activeTimeEntry.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              breakMinutes: newBreakMinutes,
            }),
          }
        );

        if (response.ok) {
          setIsOnBreak(false);
          setBreakStartTime(null);
          await fetchStatus();
          toast.success("Break ended");
        } else {
          toast.error("Failed to end break");
        }
      } catch (err) {
        captureException(err);
        toast.error("Failed to end break");
      }
    } else {
      // Start break
      setIsOnBreak(true);
      setBreakStartTime(new Date().toISOString());
      toast.success("Break started");
    }

    setIsLoading(false);
  }, [activeTimeEntry, isOnBreak, breakStartTime, fetchStatus]);

  // Open clock in dialog with location check
  const openClockInDialog = useCallback(async () => {
    setLocationWarning(null);
    setCurrentLocation(null);
    setPhotoDataUrl(null);

    // Get current location for verification
    const geoLocation = await getCurrentLocation();
    if (geoLocation) {
      setCurrentLocation(geoLocation);
    }

    setShowClockInDialog(true);
  }, [getCurrentLocation]);

  const getEmployeeName = () => {
    if (!employee) {
      return "Unknown";
    }
    return (
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
      employee.email
    );
  };

  return (
    <>
      <Header page="Time Clock" pages={["Staff"]} />

      {/* Offline indicator banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2">
          <WifiOff className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            You're offline. Actions will sync when you reconnect.
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between gap-2 bg-rose-500 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-white" />
            <span className="font-medium text-white">{error}</span>
          </div>
          <Button
            className="h-6 px-2 text-white text-xs"
            onClick={() => setError(null)}
            size="sm"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Sync queue indicator */}
      {offlineQueue.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-blue-500 px-4 py-2">
          <AlertCircle className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            {offlineQueue.length} action{offlineQueue.length > 1 ? "s" : ""}{" "}
            pending sync
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        {/* Status Card */}
        <Card className="mb-4 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">{getEmployeeName()}</h2>
              <p className="text-muted-foreground text-sm">{employee?.role}</p>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-600 text-sm">
                  <Wifi className="h-3 w-3" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 text-sm">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
            </div>
          </div>

          {/* Clock Status */}
          <div className="mb-6 text-center">
            {activeTimeEntry ? (
              <div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <span className="font-bold text-2xl text-emerald-600">
                    Clocked In
                  </span>
                </div>
                <div className="text-muted-foreground mb-1 text-sm">
                  Since {formatTime(activeTimeEntry.clock_in)}
                  {activeTimeEntry.location_name && (
                    <span className="ml-2">
                      at {activeTimeEntry.location_name}
                    </span>
                  )}
                </div>
                <div className="font-bold text-4xl text-slate-900">
                  {clockedInDuration}
                </div>
                {isOnBreak && breakStartTime && (
                  <div className="mt-2 text-amber-600 text-sm">
                    <Coffee className="mr-1 inline h-4 w-4" />
                    On break since {formatTime(breakStartTime)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Clock className="h-6 w-6 text-slate-400" />
                  <span className="font-bold text-2xl text-slate-500">
                    Clocked Out
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Ready to start your shift
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {activeTimeEntry ? (
              <>
                {/* Break Button */}
                <Button
                  className={`h-16 w-full text-lg font-bold ${
                    isOnBreak
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                  disabled={isLoading}
                  onClick={handleBreakToggle}
                >
                  <Coffee className="mr-2 h-6 w-6" />
                  {isOnBreak ? "END BREAK" : "START BREAK"}
                </Button>

                {/* Clock Out Button */}
                <Button
                  className="h-20 w-full bg-rose-500 text-xl font-bold hover:bg-rose-600"
                  disabled={isLoading}
                  onClick={handleClockOut}
                >
                  <Clock className="mr-2 h-6 w-6" />
                  CLOCK OUT
                </Button>
              </>
            ) : (
              <Button
                className="h-24 w-full bg-emerald-500 text-2xl font-bold hover:bg-emerald-600"
                disabled={isLoading}
                onClick={openClockInDialog}
              >
                <Clock className="mr-2 h-8 w-8" />
                CLOCK IN
              </Button>
            )}
          </div>
        </Card>

        {/* Location Status */}
        {currentLocation && (
          <Card className="mb-4 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium text-sm">Location Captured</div>
                <div className="text-muted-foreground text-xs">
                  Lat: {currentLocation.latitude.toFixed(6)}, Lon:{" "}
                  {currentLocation.longitude.toFixed(6)}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center">
          <Button
            disabled={isLoading || !isOnline}
            onClick={fetchStatus}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Clock In Dialog */}
      <Dialog onOpenChange={setShowClockInDialog} open={showClockInDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
            <DialogDescription>
              Select your work location and optionally add notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location">Work Location</Label>
              <Select
                onValueChange={setSelectedLocationId}
                value={selectedLocationId}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this shift..."
                value={notes}
              />
            </div>

            {/* Photo Verification */}
            <div className="space-y-2">
              <Label>Photo Verification (Optional)</Label>
              <input
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handlePhotoCapture}
                ref={fileInputRef}
                type="file"
              />
              <Button
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Camera className="mr-2 h-4 w-4" />
                {photoDataUrl ? "Retake Photo" : "Take Photo"}
              </Button>
              {photoDataUrl && (
                <div className="mt-2">
                  <img
                    alt="Verification"
                    className="h-24 w-24 rounded-lg object-cover"
                    src={photoDataUrl}
                  />
                </div>
              )}
            </div>

            {/* Location Warning */}
            {locationWarning && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{locationWarning}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="h-14 bg-emerald-500 text-lg font-bold hover:bg-emerald-600"
              disabled={isLoading || !selectedLocationId}
              onClick={handleClockIn}
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Clock className="mr-2 h-5 w-5" />
              )}
              CLOCK IN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Override Dialog */}
      <Dialog
        onOpenChange={setShowLocationOverrideDialog}
        open={showLocationOverrideDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Location Warning</DialogTitle>
            <DialogDescription>
              Your current location appears to be far from the selected work
              location. Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowLocationOverrideDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={() => setShowLocationOverrideDialog(false)}>
              Override & Clock In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
