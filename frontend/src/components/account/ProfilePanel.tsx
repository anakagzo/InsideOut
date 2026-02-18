import { useEffect, useState } from "react";
import { User, Save, Mail, Phone, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser, updateCurrentUser } from "@/store/thunks";

interface ProfilePanelProps {
  currentUserId: string;
}

export const ProfilePanel = ({ currentUserId }: ProfilePanelProps) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.users.currentUser);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: currentUser?.first_name || "",
    lastName: currentUser?.last_name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone_number || "",
    occupation: currentUser?.occupation || "",
  });

  useEffect(() => {
    if (!currentUser && currentUserId) {
      dispatch(fetchCurrentUser());
    }
  }, [currentUser, currentUserId, dispatch]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setFormData({
      firstName: currentUser.first_name || "",
      lastName: currentUser.last_name || "",
      email: currentUser.email || "",
      phone: currentUser.phone_number || "",
      occupation: currentUser.occupation || "",
    });
  }, [currentUser]);

  const handleSave = async () => {
    try {
      await dispatch(
        updateCurrentUser({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phone,
          occupation: formData.occupation,
        }),
      ).unwrap();

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch {
      toast.error("Unable to update profile.");
    }
  };

  if (!currentUser) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  const initials = currentUser.initials || `${formData.firstName[0] ?? ""}${formData.lastName[0] ?? ""}`.toUpperCase();

  const roleLabel = currentUser.role === "admin" ? "Tutor / Admin" : "Student";

  const roleBadgeClass =
    currentUser.role === "admin" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground";

  const displayName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();

  const isEmailEditable = false;

  const onCancel = () => {
    setFormData({
      firstName: currentUser.first_name || "",
      lastName: currentUser.last_name || "",
      email: currentUser.email || "",
      phone: currentUser.phone_number || "",
      occupation: currentUser.occupation || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center pb-6 border-b border-border">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-3">
          {initials}
        </div>
        <p className="font-semibold text-card-foreground text-lg">
          {displayName}
        </p>
        <span className={`text-xs px-3 py-1 rounded-full mt-2 ${roleBadgeClass}`}>
          {roleLabel}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="flex items-center gap-1 mb-1.5">
              <User className="w-3.5 h-3.5" /> First Name
            </Label>
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label className="flex items-center gap-1 mb-1.5">
              <User className="w-3.5 h-3.5" /> Last Name
            </Label>
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-1 mb-1.5">
            <Mail className="w-3.5 h-3.5" /> Email
          </Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!isEditing || !isEmailEditable}
          />
        </div>

        <div>
          <Label className="flex items-center gap-1 mb-1.5">
            <Phone className="w-3.5 h-3.5" /> Phone
          </Label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!isEditing}
            placeholder="Optional"
          />
        </div>

        <div>
          <Label className="flex items-center gap-1 mb-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Occupation
          </Label>
          <Input
            value={formData.occupation}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            disabled={!isEditing}
          />
        </div>

        <div className="pt-4">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
