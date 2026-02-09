import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl text-card-foreground">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
        </DialogHeader>

        {mode === "login" ? (
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-card-foreground">Email</Label>
              <Input id="login-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-card-foreground">Password</Label>
              <Input id="login-password" type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <button type="button" onClick={() => setMode("register")} className="text-primary font-medium hover:underline">
                Register
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reg-first" className="text-card-foreground text-sm">First Name</Label>
                <Input id="reg-first" placeholder="Jane" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-last" className="text-card-foreground text-sm">Last Name</Label>
                <Input id="reg-last" placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-email" className="text-card-foreground text-sm">Email</Label>
              <Input id="reg-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-phone" className="text-card-foreground text-sm">Phone (optional)</Label>
              <Input id="reg-phone" type="tel" placeholder="+44 7000 000000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-occupation" className="text-card-foreground text-sm">Occupation</Label>
              <Input id="reg-occupation" placeholder="Student, Professional, etc." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reg-pass" className="text-card-foreground text-sm">Password</Label>
                <Input id="reg-pass" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-confirm" className="text-card-foreground text-sm">Confirm</Label>
                <Input id="reg-confirm" type="password" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Create Account
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
                Sign In
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
