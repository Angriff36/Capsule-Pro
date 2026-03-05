"use client";

import { useState, useTransition } from "react";
import { Mail, Phone, MessageSquare, FileText, Bell } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Switch } from "@repo/design-system/components/ui/switch";
import { Label } from "@repo/design-system/components/ui/label";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { toast } from "@repo/design-system/components/ui/use-toast";
import type {
  CommunicationChannel,
  CommunicationContentType,
  CommunicationFrequency,
  CommunicationPreferences,
  DayOfWeek,
  TimePreference,
} from "@repo/database";
import {
  updateClientGlobalOptOut,
  updateClientChannelEnabled,
  updateClientChannelFrequency,
  updateClientChannelContentTypes,
  updateClientChannelTiming,
  updateClientChannelAllowedDays,
  updateClientPreferredChannels,
  resetClientCommunicationPreferences,
} from "../../../actions/communication-preferences";

interface CommunicationPreferencesTabProps {
  clientId: string;
  initialPreferences: CommunicationPreferences;
}

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: "Email",
  sms: "SMS",
  phone: "Phone",
  mail: "Direct Mail",
};

const CHANNEL_ICONS: Record<CommunicationChannel, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  mail: <FileText className="h-4 w-4" />,
};

const FREQUENCY_LABELS: Record<CommunicationFrequency, string> = {
  immediate: "Immediately",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  never: "Never",
};

const CONTENT_TYPE_LABELS: Record<CommunicationContentType, string> = {
  marketing: "Marketing",
  promotions: "Promotions",
  updates: "Updates",
  reminders: "Reminders",
  invoices: "Invoices",
  proposals: "Proposals",
  events: "Events",
  surveys: "Surveys",
  newsletters: "Newsletters",
  alerts: "Alerts",
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export function CommunicationPreferencesTab({
  clientId,
  initialPreferences,
}: CommunicationPreferencesTabProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const handleGlobalOptOutChange = (optOut: boolean) => {
    startTransition(async () => {
      setIsSaving(true);
      try {
        const updated = await updateClientGlobalOptOut(clientId, optOut);
        setPreferences(updated);
        toast({
          title: optOut ? "Opted out of all communications" : "Opted in to communications",
          description: optOut
            ? "This client will not receive any communications."
            : "This client will receive communications based on their channel preferences.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleChannelEnabledChange = (channel: CommunicationChannel, enabled: boolean) => {
    startTransition(async () => {
      setIsSaving(true);
      try {
        const updated = await updateClientChannelEnabled(clientId, channel, enabled);
        setPreferences(updated);
        toast({
          title: `${CHANNEL_LABELS[channel]} ${enabled ? "enabled" : "disabled"}`,
          description: `${CHANNEL_LABELS[channel]} communications have been ${enabled ? "enabled" : "disabled"}.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleFrequencyChange = (channel: CommunicationChannel, frequency: CommunicationFrequency) => {
    startTransition(async () => {
      setIsSaving(true);
      try {
        const updated = await updateClientChannelFrequency(clientId, channel, frequency);
        setPreferences(updated);
        toast({
          title: "Frequency updated",
          description: `${CHANNEL_LABELS[channel]} frequency set to ${FREQUENCY_LABELS[frequency]}.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleContentTypeToggle = (
    channel: CommunicationChannel,
    contentType: CommunicationContentType,
    checked: boolean
  ) => {
    startTransition(async () => {
      setIsSaving(true);
      try {
        const currentTypes = preferences[channel].contentTypes;
        const newTypes = checked
          ? [...currentTypes, contentType]
          : currentTypes.filter((t) => t !== contentType);
        const updated = await updateClientChannelContentTypes(clientId, channel, newTypes);
        setPreferences(updated);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleTimingChange = (channel: CommunicationChannel, timing: TimePreference) => {
    startTransition(async () => {
      setIsSaving(true);
      try {
        const updated = await updateClientChannelTiming(clientId, channel, timing);
        setPreferences(updated);
        toast({
          title: "Timing updated",
          description: `${CHANNEL_LABELS[channel]} timing preferences updated.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleAllowedDaysToggle = (channel: CommunicationChannel, day: DayOfWeek, checked: boolean) => {
    startTransition(async () => {
      setIsSaving(true);
      try {
        const currentDays = preferences[channel].allowedDays || [];
        const newDays = checked
          ? [...currentDays, day]
          : currentDays.filter((d) => d !== day);
        const updated = await updateClientChannelAllowedDays(clientId, channel, newDays);
        setPreferences(updated);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleResetToDefaults = () => {
    startTransition(async () => {
      setIsSaving(true);
      try {
        const updated = await resetClientCommunicationPreferences(clientId);
        setPreferences(updated);
        toast({
          title: "Preferences reset",
          description: "Communication preferences have been reset to defaults.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to reset preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const movePreferredChannel = (fromIndex: number, toIndex: number) => {
    const channels = [...(preferences.global.preferredChannels || [])];
    const [moved] = channels.splice(fromIndex, 1);
    channels.splice(toIndex, 0, moved);

    startTransition(async () => {
      setIsSaving(true);
      try {
        const updated = await updateClientPreferredChannels(clientId, channels);
        setPreferences(updated);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Communication Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Manage how and when this client receives communications
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetToDefaults} disabled={isSaving}>
          Reset to Defaults
        </Button>
      </div>

      {/* Global Opt-Out */}
      <Card className={preferences.global.optOut ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Communication Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="global-optout">Opt out of all communications</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, this client will not receive any communications regardless of channel
                settings
              </p>
            </div>
            <Switch
              id="global-optout"
              checked={preferences.global.optOut}
              onCheckedChange={handleGlobalOptOutChange}
              disabled={isSaving}
            />
          </div>

          {preferences.global.optOutAt && (
            <p className="text-xs text-muted-foreground">
              Opted out on {new Date(preferences.global.optOutAt).toLocaleDateString()}
            </p>
          )}

          {/* Preferred Channel Order */}
          {!preferences.global.optOut && (
            <div className="space-y-2">
              <Label>Preferred Communication Channels</Label>
              <p className="text-xs text-muted-foreground">
                Drag to reorder - channels will be tried in this order
              </p>
              <div className="flex flex-wrap gap-2">
                {(preferences.global.preferredChannels || []).map((channel, index) => (
                  <Badge
                    key={channel}
                    variant="secondary"
                    className="cursor-pointer flex items-center gap-1"
                  >
                    {CHANNEL_ICONS[channel]}
                    {CHANNEL_LABELS[channel]}
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => movePreferredChannel(index, index - 1)}
                      >
                        ←
                      </Button>
                    )}
                    {index < (preferences.global.preferredChannels?.length || 0) - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => movePreferredChannel(index, index + 1)}
                      >
                        →
                      </Button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Settings */}
      <div className="space-y-4">
        {(["email", "sms", "phone", "mail"] as CommunicationChannel[]).map((channel) => (
          <ChannelSettingsCard
            key={channel}
            channel={channel}
            preferences={preferences}
            onEnabledChange={(enabled) => handleChannelEnabledChange(channel, enabled)}
            onFrequencyChange={(frequency) => handleFrequencyChange(channel, frequency)}
            onContentTypeToggle={(contentType, checked) =>
              handleContentTypeToggle(channel, contentType, checked)
            }
            onTimingChange={(timing) => handleTimingChange(channel, timing)}
            onAllowedDaysToggle={(day, checked) => handleAllowedDaysToggle(channel, day, checked)}
            disabled={isSaving || preferences.global.optOut}
          />
        ))}
      </div>
    </div>
  );
}

interface ChannelSettingsCardProps {
  channel: CommunicationChannel;
  preferences: CommunicationPreferences;
  onEnabledChange: (enabled: boolean) => void;
  onFrequencyChange: (frequency: CommunicationFrequency) => void;
  onContentTypeToggle: (contentType: CommunicationContentType, checked: boolean) => void;
  onTimingChange: (timing: TimePreference) => void;
  onAllowedDaysToggle: (day: DayOfWeek, checked: boolean) => void;
  disabled: boolean;
}

function ChannelSettingsCard({
  channel,
  preferences,
  onEnabledChange,
  onFrequencyChange,
  onContentTypeToggle,
  onTimingChange,
  onAllowedDaysToggle,
  disabled,
}: ChannelSettingsCardProps) {
  const channelPrefs = preferences[channel];

  return (
    <Card className={!channelPrefs.enabled ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {CHANNEL_ICONS[channel]}
            {CHANNEL_LABELS[channel]}
          </CardTitle>
          <Switch
            checked={channelPrefs.enabled}
            onCheckedChange={onEnabledChange}
            disabled={disabled}
          />
        </div>
      </CardHeader>
      {channelPrefs.enabled && (
        <CardContent className="space-y-4">
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={channelPrefs.frequency}
              onValueChange={(value) => onFrequencyChange(value as CommunicationFrequency)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Types */}
          <div className="space-y-2">
            <Label>Content Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${channel}-${value}`}
                    checked={channelPrefs.contentTypes.includes(value as CommunicationContentType)}
                    onCheckedChange={(checked) =>
                      onContentTypeToggle(value as CommunicationContentType, checked as boolean)
                    }
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`${channel}-${value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Time Restrictions</Label>
              <Switch
                checked={channelPrefs.timing?.enabled ?? false}
                onCheckedChange={(enabled) =>
                  onTimingChange({ ...channelPrefs.timing, enabled } as TimePreference)
                }
                disabled={disabled}
              />
            </div>
            {channelPrefs.timing?.enabled && (
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Label htmlFor={`${channel}-start`} className="text-xs">
                    From
                  </Label>
                  <input
                    id={`${channel}-start`}
                    type="time"
                    value={channelPrefs.timing?.start ?? "09:00"}
                    onChange={(e) =>
                      onTimingChange({ ...channelPrefs.timing, start: e.target.value } as TimePreference)
                    }
                    className="w-full px-2 py-1 text-sm border rounded"
                    disabled={disabled}
                  />
                </div>
                <span className="text-muted-foreground">to</span>
                <div className="flex-1">
                  <Label htmlFor={`${channel}-end`} className="text-xs">
                    To
                  </Label>
                  <input
                    id={`${channel}-end`}
                    type="time"
                    value={channelPrefs.timing?.end ?? "17:00"}
                    onChange={(e) =>
                      onTimingChange({ ...channelPrefs.timing, end: e.target.value } as TimePreference)
                    }
                    className="w-full px-2 py-1 text-sm border rounded"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Allowed Days */}
          <div className="space-y-2">
            <Label>Allowed Days</Label>
            <div className="flex gap-1">
              {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as DayOfWeek[]).map(
                (day) => (
                  <Button
                    key={day}
                    variant={
                      (channelPrefs.allowedDays || []).includes(day) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      onAllowedDaysToggle(
                        day,
                        !(channelPrefs.allowedDays || []).includes(day)
                      )
                    }
                    disabled={disabled}
                    className="flex-1"
                  >
                    {DAY_LABELS[day]}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
