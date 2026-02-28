import { useMemo, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/store/hooks";
import { fetchCurrentUser, loginUser, registerUser } from "@/store/thunks";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated?: () => void;
}

export function AuthModal({ open, onOpenChange, onAuthenticated }: AuthModalProps) {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [occupation, setOccupation] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const phoneRegex = useMemo(() => /^[+]?[-()\s\d]{7,20}$/, []);

  const isValidPhoneNumber = (value: string): boolean => {
    if (!phoneRegex.test(value)) {
      return false;
    }

    const digitsOnly = value.replace(/\D/g, "");
    return digitsOnly.length >= 7;
  };

  const resetFormState = () => {
    setFormError(null);
    setSubmitting(false);
    setLoginEmail("");
    setLoginPassword("");
    setFirstName("");
    setLastName("");
    setRegisterEmail("");
    setPhoneNumber("");
    setOccupation("");
    setRegisterPassword("");
    setConfirmPassword("");
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
  };

  const closeModal = () => {
    resetFormState();
    setMode("login");
    onOpenChange(false);
  };

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }

    return "Something went wrong. Please try again.";
  };

  const isInvalidCredentialsError = (message: string): boolean =>
    message.trim().toLowerCase() === "invalid credentials";

  const validateLogin = (): string | null => {
    if (!loginEmail.trim() || !loginPassword) {
      return "Email and password are required.";
    }

    if (!emailRegex.test(loginEmail.trim())) {
      return "Please enter a valid email address.";
    }

    return null;
  };

  const validateRegister = (): string | null => {
    if (!firstName.trim() || !lastName.trim()) {
      return "First name and last name are required.";
    }

    if (!registerEmail.trim() || !emailRegex.test(registerEmail.trim())) {
      return "Please enter a valid email address.";
    }

    if (!registerPassword || !confirmPassword) {
      return "Password and confirmation are required.";
    }

    if (registerPassword.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (registerPassword !== confirmPassword) {
      return "Passwords do not match.";
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      return "Please enter a valid phone number or leave it blank.";
    }

    return null;
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validationError = validateLogin();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await dispatch(
        loginUser({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      ).unwrap();
      await dispatch(fetchCurrentUser()).unwrap();
      toast.success("Signed in successfully.");
      closeModal();
      onAuthenticated?.();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setFormError(errorMessage);

      if (isInvalidCredentialsError(errorMessage)) {
        setLoginEmail("");
        setLoginPassword("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validationError = validateRegister();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await dispatch(
        registerUser({
          email: registerEmail.trim().toLowerCase(),
          password: registerPassword,
          confirm_password: confirmPassword,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || undefined,
          occupation: occupation.trim() || undefined,
        }),
      ).unwrap();
      await dispatch(fetchCurrentUser()).unwrap();
      toast.success("Account created successfully.");
      closeModal();
      onAuthenticated?.();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode: "login" | "register") => {
    setFormError(null);
    setMode(nextMode);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeModal();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl text-card-foreground">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
        </DialogHeader>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        {mode === "login" ? (
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-card-foreground">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-card-foreground">Password</Label>
              <div className="space-y-1">
                <Input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onMouseDown={() => setShowLoginPassword(true)}
                  onMouseUp={() => setShowLoginPassword(false)}
                  onMouseLeave={() => setShowLoginPassword(false)}
                  onTouchStart={() => setShowLoginPassword(true)}
                  onTouchEnd={() => setShowLoginPassword(false)}
                >
                  Hold to view password
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Signing In..." : "Sign In"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-primary font-medium hover:underline"
              >
                Register
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleRegisterSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reg-first" className="text-card-foreground text-sm">First Name</Label>
                <Input
                  id="reg-first"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-last" className="text-card-foreground text-sm">Last Name</Label>
                <Input
                  id="reg-last"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-email" className="text-card-foreground text-sm">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-phone" className="text-card-foreground text-sm">Phone (optional)</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="+44 7000 000000"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                pattern="^[+]?[-()\s\d]{7,20}$"
                title="Enter a valid phone number or leave this blank"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-occupation" className="text-card-foreground text-sm">Occupation (optional)</Label>
              <Input
                id="reg-occupation"
                placeholder="Student, Professional, etc."
                value={occupation}
                onChange={(event) => setOccupation(event.target.value)}
                autoComplete="organization-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reg-pass" className="text-card-foreground text-sm">Password</Label>
                <div className="space-y-1">
                  <Input
                    id="reg-pass"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onMouseDown={() => setShowRegisterPassword(true)}
                    onMouseUp={() => setShowRegisterPassword(false)}
                    onMouseLeave={() => setShowRegisterPassword(false)}
                    onTouchStart={() => setShowRegisterPassword(true)}
                    onTouchEnd={() => setShowRegisterPassword(false)}
                  >
                    Hold to view
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-confirm" className="text-card-foreground text-sm">Confirm</Label>
                <div className="space-y-1">
                  <Input
                    id="reg-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onMouseDown={() => setShowConfirmPassword(true)}
                    onMouseUp={() => setShowConfirmPassword(false)}
                    onMouseLeave={() => setShowConfirmPassword(false)}
                    onTouchStart={() => setShowConfirmPassword(true)}
                    onTouchEnd={() => setShowConfirmPassword(false)}
                  >
                    Hold to view
                  </button>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Creating Account..." : "Create Account"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-primary font-medium hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
