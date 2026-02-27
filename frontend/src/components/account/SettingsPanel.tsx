import { useEffect, useState } from "react";
import { Bell, Clock, Lock, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  changeCurrentUserPassword,
  fetchAvailability,
  fetchNotificationSettings,
  upsertAvailability,
  upsertNotificationSettings,
} from "@/store/thunks";

interface SettingsPanelProps {
  isAdmin: boolean;
}

const DAYS_OF_WEEK = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
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
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.users.currentUser);
  const notificationSettings = useAppSelector((state) => state.notificationSettings.current);
  const availabilityConfig = useAppSelector((state) => state.availability.current);

  const [notifications, setNotifications] = useState({
    successfulPayment: true,
    schedulingOnboarding: true,
    newCourseAdded: false,
    meetingReminder: true,
    meetingReminderLeadMinutes: 60,
  });

  const [monthStart, setMonthStart] = useState(String(new Date().getMonth() + 1));
  const [monthEnd, setMonthEnd] = useState(String(new Date().getMonth() + 1));

  const [availabilityDays, setAvailabilityDays] = useState<
    Array<{
      id: string;
      day: string;
      timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
      }>;
    }>
  >([
    {
      id: "day-1",
      day: "1",
      timeSlots: [{ id: "slot-1", startTime: "09:00", endTime: "17:00" }],
    },
  ]);

  // Date overrides
  const [dateOverrides, setDateOverrides] = useState<{ id: string; date: string; available: boolean }[]>([]);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [currentPasswordEditable, setCurrentPasswordEditable] = useState(false);
  const [newPasswordEditable, setNewPasswordEditable] = useState(false);
  const [confirmPasswordEditable, setConfirmPasswordEditable] = useState(false);

  useEffect(() => {
    dispatch(fetchNotificationSettings());
    if (isAdmin) {
      dispatch(fetchAvailability());
    }
  }, [dispatch, isAdmin]);

  useEffect(() => {
    if (!notificationSettings) {
      return;
    }

    setNotifications({
      successfulPayment: notificationSettings.notify_on_new_payment,
      schedulingOnboarding: notificationSettings.notify_on_schedule_change,
      newCourseAdded: notificationSettings.notify_on_new_course,
      meetingReminder: notificationSettings.notify_on_meeting_reminder,
      meetingReminderLeadMinutes: notificationSettings.meeting_reminder_lead_minutes ?? 60,
    });
  }, [notificationSettings]);

  useEffect(() => {
    if (!availabilityConfig || !isAdmin) {
      return;
    }

    const incomingMonthStart = availabilityConfig.month_start ?? 1;
    const incomingMonthEnd = availabilityConfig.month_end ?? incomingMonthStart;
    setMonthStart(String(incomingMonthStart));
    setMonthEnd(String(incomingMonthEnd));

    const days = availabilityConfig.availability.map((dayItem, index) => ({
      id: `day-${dayItem.day_of_week}-${index}`,
      day: String(dayItem.day_of_week),
      timeSlots: (dayItem.time_slots || []).map((slot, slotIndex) => ({
        id: `slot-${dayItem.day_of_week}-${slotIndex}-${slot.start_time}`,
        startTime: slot.start_time.slice(0, 5),
        endTime: slot.end_time.slice(0, 5),
      })),
    }));

    if (days.length > 0) {
      setAvailabilityDays(days);
    }

    const overrides = (availabilityConfig.unavailable_dates || []).map((item, index) => ({
      id: `${item.unavailable_date}-${index}`,
      date: item.unavailable_date,
      available: false,
    }));
    setDateOverrides(overrides);
  }, [availabilityConfig, isAdmin]);

  const handleNotificationSave = async () => {
    try {
      await dispatch(
        upsertNotificationSettings({
          user_id: currentUser?.id,
          notify_on_new_payment: notifications.successfulPayment,
          notify_on_schedule_change: notifications.schedulingOnboarding,
          notify_on_new_course: notifications.newCourseAdded,
          notify_on_meeting_reminder: notifications.meetingReminder,
          meeting_reminder_lead_minutes: Math.max(30, Math.min(1440, notifications.meetingReminderLeadMinutes)),
        }),
      ).unwrap();
      toast.success("Notification settings saved!");
    } catch {
      toast.error("Unable to save notification settings.");
    }
  };

  const addAvailabilityDay = () => {
    const usedDays = new Set(availabilityDays.map((item) => item.day));
    const nextDay = DAYS_OF_WEEK.find((item) => !usedDays.has(item.value));

    if (!nextDay) {
      toast.error("All days of week are already added.");
      return;
    }

    setAvailabilityDays([
      ...availabilityDays,
      {
        id: `day-${Date.now()}`,
        day: nextDay.value,
        timeSlots: [{ id: `slot-${Date.now()}`, startTime: "09:00", endTime: "17:00" }],
      },
    ]);
  };

  const removeAvailabilityDay = (dayId: string) => {
    setAvailabilityDays(availabilityDays.filter((item) => item.id !== dayId));
  };

  const updateAvailabilityDay = (dayId: string, nextDay: string) => {
    const duplicate = availabilityDays.some((item) => item.id !== dayId && item.day === nextDay);
    if (duplicate) {
      toast.error("Each day of week can only be added once.");
      return;
    }

    setAvailabilityDays(
      availabilityDays.map((item) => (item.id === dayId ? { ...item, day: nextDay } : item)),
    );
  };

  const addTimeSlotToDay = (dayId: string) => {
    setAvailabilityDays(
      availabilityDays.map((item) =>
        item.id === dayId
          ? {
              ...item,
              timeSlots: [
                ...item.timeSlots,
                { id: `slot-${Date.now()}`, startTime: "09:00", endTime: "17:00" },
              ],
            }
          : item,
      ),
    );
  };

  const removeTimeSlotFromDay = (dayId: string, slotId: string) => {
    setAvailabilityDays(
      availabilityDays.map((item) =>
        item.id === dayId
          ? {
              ...item,
              timeSlots: item.timeSlots.filter((slot) => slot.id !== slotId),
            }
          : item,
      ),
    );
  };

  const updateTimeSlot = (
    dayId: string,
    slotId: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setAvailabilityDays(
      availabilityDays.map((item) =>
        item.id === dayId
          ? {
              ...item,
              timeSlots: item.timeSlots.map((slot) =>
                slot.id === slotId
                  ? {
                      ...slot,
                      [field]: value,
                    }
                  : slot,
              ),
            }
          : item,
      ),
    );
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

  const handleAvailabilitySave = async () => {
    try {
      const parsedMonthStart = Number(monthStart);
      const parsedMonthEnd = Number(monthEnd);

      if (!Number.isInteger(parsedMonthStart) || parsedMonthStart < 1 || parsedMonthStart > 12) {
        toast.error("Month start must be between January and December.");
        return;
      }

      if (!Number.isInteger(parsedMonthEnd) || parsedMonthEnd < 1 || parsedMonthEnd > 12) {
        toast.error("Month end must be between January and December.");
        return;
      }

      if (parsedMonthEnd < parsedMonthStart) {
        toast.error("Month end must be the same as or after month start.");
        return;
      }

      if (availabilityDays.length === 0) {
        toast.error("Add at least one day of availability.");
        return;
      }

      const dayValues = availabilityDays.map((item) => item.day);
      if (new Set(dayValues).size !== dayValues.length) {
        toast.error("Each day of week can only be added once.");
        return;
      }

      for (const dayItem of availabilityDays) {
        if (dayItem.timeSlots.length === 0) {
          toast.error("Each day must include at least one time slot.");
          return;
        }

        const sortedSlots = [...dayItem.timeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));

        for (let index = 0; index < sortedSlots.length; index += 1) {
          const slot = sortedSlots[index];

          if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
            toast.error("Each time slot must have a start time earlier than end time.");
            return;
          }

          if (index > 0 && sortedSlots[index - 1].endTime > slot.startTime) {
            toast.error("Overlapping time slots are not allowed within the same day.");
            return;
          }
        }
      }

      const payload = {
        month_start: parsedMonthStart,
        month_end: parsedMonthEnd,
        availability: availabilityDays
          .map((dayItem) => ({
            day_of_week: Number(dayItem.day),
            time_slots: dayItem.timeSlots
              .map((slot) => ({
                start_time: `${slot.startTime}:00`,
                end_time: `${slot.endTime}:00`,
              }))
              .sort((a, b) => a.start_time.localeCompare(b.start_time)),
          }))
          .sort((a, b) => a.day_of_week - b.day_of_week),
        unavailable_dates: dateOverrides.filter((item) => !item.available && Boolean(item.date)).map((item) => item.date),
      };

      await dispatch(upsertAvailability(payload)).unwrap();
      toast.success("Availability settings saved!");
    } catch {
      toast.error("Unable to save availability settings.");
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters!");
      return;
    }
    try {
      await dispatch(
        changeCurrentUserPassword({
          old_password: passwords.current,
          new_password: passwords.new,
        }),
      ).unwrap();
      toast.success("Password changed successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
      setCurrentPasswordEditable(false);
      setNewPasswordEditable(false);
      setConfirmPasswordEditable(false);
    } catch {
      toast.error("Unable to change password.");
    }
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
        <p className="text-xs text-muted-foreground">
          Meeting reminders are enabled by default and are sent 1 hour before your meeting. You can customize this between 30 minutes and 24 hours.
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
              <p className="text-sm font-medium text-card-foreground">Meeting Reminder</p>
              <p className="text-xs text-muted-foreground">Reminder before scheduled meetings (default 1 hour)</p>
            </div>
            <Switch
              checked={notifications.meetingReminder}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, meetingReminder: checked })
              }
            />
          </div>

          <div className="p-3 bg-muted rounded-lg space-y-2">
            <Label htmlFor="meeting-reminder-lead" className="text-sm font-medium text-card-foreground">
              Reminder lead time (minutes)
            </Label>
            <Input
              id="meeting-reminder-lead"
              type="number"
              min={30}
              max={1440}
              value={notifications.meetingReminderLeadMinutes}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                const safeValue = Number.isFinite(nextValue) ? nextValue : 60;
                setNotifications({
                  ...notifications,
                  meetingReminderLeadMinutes: Math.max(30, Math.min(1440, safeValue)),
                });
              }}
              disabled={!notifications.meetingReminder}
            />
            <p className="text-xs text-muted-foreground">Minimum 30, maximum 1440 (24 hours).</p>
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

          <div className="p-3 bg-muted rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-card-foreground">Month Start</Label>
              <Select value={monthStart} onValueChange={setMonthStart}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month start" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-card-foreground">Month End</Label>
              <Select value={monthEnd} onValueChange={setMonthEnd}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month end" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Availability Slots */}
          <div className="space-y-3 overflow-x-auto">
            {availabilityDays.map((dayItem) => (
              <div key={dayItem.id} className="p-3 bg-muted rounded-lg space-y-3 min-w-fit">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={dayItem.day}
                    onValueChange={(value) => updateAvailabilityDay(dayItem.id, value)}
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

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => removeAvailabilityDay(dayItem.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {dayItem.timeSlots.map((slot) => (
                    <div key={slot.id} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) =>
                          updateTimeSlot(dayItem.id, slot.id, "startTime", event.target.value)
                        }
                        className="w-24"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) =>
                          updateTimeSlot(dayItem.id, slot.id, "endTime", event.target.value)
                        }
                        className="w-24"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeTimeSlotFromDay(dayItem.id, slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={() => addTimeSlotToDay(dayItem.id)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Time Slot
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" className="w-full" onClick={addAvailabilityDay}>
              <Plus className="w-4 h-4 mr-1" /> Add Day
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
              name="current-password-manual-entry"
              autoComplete="off"
              readOnly={!currentPasswordEditable}
              onFocus={() => setCurrentPasswordEditable(true)}
              data-lpignore="true"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              name="new-password-manual-entry"
              autoComplete="off"
              readOnly={!newPasswordEditable}
              onFocus={() => setNewPasswordEditable(true)}
              data-lpignore="true"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              name="confirm-password-manual-entry"
              autoComplete="off"
              readOnly={!confirmPasswordEditable}
              onFocus={() => setConfirmPasswordEditable(true)}
              data-lpignore="true"
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
