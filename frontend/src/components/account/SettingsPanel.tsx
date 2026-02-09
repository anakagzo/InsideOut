import { useState } from "react";
import { Bell, Clock, Lock, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SettingsPanelProps {
  isAdmin: boolean;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export const SettingsPanel = ({ isAdmin }: SettingsPanelProps) => {
  // Notification settings state
  const [notifications, setNotifications] = useState({
    successfulPayment: true,
    schedulingOnboarding: true,
    meetingReminder: true,
    newCourseAdded: false,
  });

  // Availability state
  const [availabilitySlots, setAvailabilitySlots] = useState([
    { id: "1", day: "1", startTime: "09:00", endTime: "17:00", months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
    { id: "2", day: "3", startTime: "09:00", endTime: "17:00", months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
    { id: "3", day: "5", startTime: "10:00", endTime: "15:00", months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
  ]);

  // Date overrides
  const [dateOverrides, setDateOverrides] = useState<{ id: string; date: string; available: boolean }[]>([]);

  // Password state
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleNotificationSave = () => {
    toast.success("Notification settings saved!");
  };

  const addAvailabilitySlot = () => {
    setAvailabilitySlots([
      ...availabilitySlots,
      { id: Date.now().toString(), day: "1", startTime: "09:00", endTime: "17:00", months: [] },
    ]);
  };

  const removeAvailabilitySlot = (id: string) => {
    setAvailabilitySlots(availabilitySlots.filter((s) => s.id !== id));
  };

  const addDateOverride = () => {
    setDateOverrides([
      ...dateOverrides,
      { id: Date.now().toString(), date: "", available: false },
    ]);
  };

  const removeDateOverride = (id: string) => {
    setDateOverrides(dateOverrides.filter((o) => o.id !== id));
  };

  const handleAvailabilitySave = () => {
    toast.success("Availability settings saved!");
  };

  const handlePasswordChange = () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters!");
      return;
    }
    toast.success("Password changed successfully!");
    setPasswords({ current: "", new: "", confirm: "" });
  };

  return (
    <Tabs defaultValue="notifications" className="w-full flex flex-col min-h-0">
      <TabsList className="w-full bg-secondary grid grid-cols-2 lg:grid-cols-3 flex-shrink-0">
        <TabsTrigger value="notifications" className="text-xs">
          <Bell className="w-3.5 h-3.5 mr-1" /> Notifications
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="availability" className="text-xs">
            <Clock className="w-3.5 h-3.5 mr-1" /> Availability
          </TabsTrigger>
        )}
        <TabsTrigger value="password" className="text-xs">
          <Lock className="w-3.5 h-3.5 mr-1" /> Password
        </TabsTrigger>
      </TabsList>

      {/* Notification Settings */}
      <TabsContent value="notifications" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Manage your email notification preferences.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-card-foreground">Successful Payment</p>
              <p className="text-xs text-muted-foreground">Get notified when a payment is successful</p>
            </div>
            <Switch
              checked={notifications.successfulPayment}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, successfulPayment: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-card-foreground">Scheduling Onboarding</p>
              <p className="text-xs text-muted-foreground">Notifications for onboarding meetings</p>
            </div>
            <Switch
              checked={notifications.schedulingOnboarding}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, schedulingOnboarding: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-card-foreground">30-Minute Meeting Reminder</p>
              <p className="text-xs text-muted-foreground">Reminder before scheduled meetings</p>
            </div>
            <Switch
              checked={notifications.meetingReminder}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, meetingReminder: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-card-foreground">New Course Added</p>
              <p className="text-xs text-muted-foreground">Be notified when new courses are available</p>
            </div>
            <Switch
              checked={notifications.newCourseAdded}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, newCourseAdded: checked })
              }
            />
          </div>
        </div>

        <Button className="w-full" onClick={handleNotificationSave}>
          <Save className="w-4 h-4 mr-1" /> Save Preferences
        </Button>
      </TabsContent>

      {/* Availability Settings (Admin Only) */}
      {isAdmin && (
        <TabsContent value="availability" className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <p className="text-sm text-muted-foreground">
            Set your available days, times, and months for scheduling sessions.
          </p>

          {/* Availability Slots */}
          <div className="space-y-3 overflow-x-auto">
            {availabilitySlots.map((slot) => (
              <div key={slot.id} className="p-3 bg-muted rounded-lg space-y-2 min-w-fit">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={slot.day}
                    onValueChange={(value) =>
                      setAvailabilitySlots(
                        availabilitySlots.map((s) =>
                          s.id === slot.id ? { ...s, day: value } : s
                        )
                      )
                    }
                  >
                    <SelectTrigger className="w-28 sm:w-32">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        setAvailabilitySlots(
                          availabilitySlots.map((s) =>
                            s.id === slot.id ? { ...s, startTime: e.target.value } : s
                          )
                        )
                      }
                      className="w-20 sm:w-24"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        setAvailabilitySlots(
                          availabilitySlots.map((s) =>
                            s.id === slot.id ? { ...s, endTime: e.target.value } : s
                          )
                        )
                      }
                      className="w-20 sm:w-24"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => removeAvailabilitySlot(slot.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {MONTHS.map((month) => (
                    <button
                      key={month.value}
                      onClick={() =>
                        setAvailabilitySlots(
                          availabilitySlots.map((s) =>
                            s.id === slot.id
                              ? {
                                  ...s,
                                  months: s.months.includes(month.value)
                                    ? s.months.filter((m) => m !== month.value)
                                    : [...s.months, month.value],
                                }
                              : s
                          )
                        )
                      }
                      className={`text-xs px-2 py-0.5 rounded ${
                        slot.months.includes(month.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {month.label.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" className="w-full" onClick={addAvailabilitySlot}>
              <Plus className="w-4 h-4 mr-1" /> Add Time Slot
            </Button>
          </div>

          {/* Date Overrides */}
          <div className="pt-4 border-t border-border">
            <Label className="text-sm font-medium mb-2 block">Date Overrides</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Override availability for specific dates.
            </p>

            <div className="space-y-2">
              {dateOverrides.map((override) => (
                <div key={override.id} className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={override.date}
                    onChange={(e) =>
                      setDateOverrides(
                        dateOverrides.map((o) =>
                          o.id === override.id ? { ...o, date: e.target.value } : o
                        )
                      )
                    }
                    className="flex-1"
                  />
                  <Select
                    value={override.available ? "available" : "unavailable"}
                    onValueChange={(value) =>
                      setDateOverrides(
                        dateOverrides.map((o) =>
                          o.id === override.id ? { ...o, available: value === "available" } : o
                        )
                      )
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeDateOverride(override.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" className="w-full" onClick={addDateOverride}>
                <Plus className="w-4 h-4 mr-1" /> Add Override
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={handleAvailabilitySave}>
            <Save className="w-4 h-4 mr-1" /> Save Availability
          </Button>
        </TabsContent>
      )}

      {/* Change Password */}
      <TabsContent value="password" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">Update your password.</p>

        <div className="space-y-3">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <Button className="w-full" onClick={handlePasswordChange}>
          <Lock className="w-4 h-4 mr-1" /> Change Password
        </Button>
      </TabsContent>
    </Tabs>
  );
};
