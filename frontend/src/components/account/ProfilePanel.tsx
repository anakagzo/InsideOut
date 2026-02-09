import { useState } from "react";
import { User, Save, Mail, Phone, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { users } from "@/lib/mock-data";
import { toast } from "sonner";

interface ProfilePanelProps {
  currentUserId: string;
}

export const ProfilePanel = ({ currentUserId }: ProfilePanelProps) => {
  const currentUser = users.find((u) => u.id === currentUserId);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: currentUser?.firstName || "",
    lastName: currentUser?.lastName || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    occupation: currentUser?.occupation || "",
  });

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Avatar and Role */}
      <div className="flex flex-col items-center pb-6 border-b border-border">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-3">
          {currentUser?.initials}
        </div>
        <p className="font-semibold text-card-foreground text-lg">
          {currentUser?.firstName} {currentUser?.lastName}
        </p>
        <span
          className={`text-xs px-3 py-1 rounded-full mt-2 ${
            currentUser?.role === "admin"
              ? "bg-primary/10 text-primary"
              : "bg-accent text-accent-foreground"
          }`}
        >
          {currentUser?.role === "admin" ? "Tutor / Admin" : "Student"}
        </span>
      </div>

      {/* Profile Form */}
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
            disabled={!isEditing}
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
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
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
