import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CreditCard, Building2, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCheckoutCourse } from "@/features/checkout/useCheckoutCourse";
import { usePayments } from "@/features/payments/usePayments";

/**
 * Formats backend decimal-like price values for display.
 */
const formatPrice = (price: string | number | null | undefined): string => {
  const numericPrice = Number(price ?? 0);
  return Number.isFinite(numericPrice) ? numericPrice.toFixed(2) : "0.00";
};

const CheckoutPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = id ? Number(id) : NaN;
  const isCourseIdValid = Number.isInteger(courseId) && courseId > 0;

  const {
    course,
    status: courseStatus,
    error: courseError,
    refetch,
  } = useCheckoutCourse(isCourseIdValid ? courseId : null);

  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "bank">("stripe");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const didFinalizeRef = useRef(false);

  const {
    createCheckoutStatus,
    createCheckoutError,
    finalizeCheckoutStatus,
    finalizeCheckoutError,
    stripeFinalizeResult,
    startStripeCheckout,
    finalizeStripePayment,
  } = usePayments();

  const coursePrice = formatPrice(course?.price);

  useEffect(() => {
    const status = searchParams.get("status");
    const sessionId = searchParams.get("session_id");
    if (status !== "success" || !sessionId || !isCourseIdValid || didFinalizeRef.current) {
      return;
    }

    didFinalizeRef.current = true;
    setCheckoutError(null);

    finalizeStripePayment(sessionId)
      .then(() => {
        setShowSuccessModal(true);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          setCheckoutError(error.message);
          return;
        }
        setCheckoutError("Unable to finalize payment right now.");
      });
  }, [finalizeStripePayment, isCourseIdValid, searchParams]);

  const isProcessing = createCheckoutStatus === "loading" || finalizeCheckoutStatus === "loading";

  if (!isCourseIdValid) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Invalid course identifier.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (courseStatus === "loading" || courseStatus === "idle") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading course details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (courseStatus === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-muted-foreground">{courseError ?? "Unable to load this course right now."}</p>
          <Button onClick={refetch} variant="outline">
            Retry
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Course not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const handlePayment = async () => {
    setCheckoutError(null);

    if (paymentMethod === "bank") {
      setCheckoutError("Bank transfer confirmation flow is not automated yet. Please use Stripe checkout.");
      return;
    }

    try {
      const checkoutSession = await startStripeCheckout(courseId);
      window.location.assign(checkoutSession.checkout_url);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setCheckoutError(error.message);
      } else {
        setCheckoutError("Unable to start Stripe checkout right now.");
      }
    }
  };

  const handleContinueToBooking = () => {
    const onboardingToken = stripeFinalizeResult?.onboarding_token;
    if (!onboardingToken) {
      setCheckoutError("Onboarding link is not available yet. Please retry payment confirmation.");
      return;
    }
    navigate(`/onboarding/${id}/${onboardingToken}`);
  };

  const handleCloseSuccessModal = (open: boolean) => {
    setShowSuccessModal(open);
    if (!open) {
      navigate(`/checkout/${id}`, { replace: true });
    }
  };

  const effectiveCheckoutError = checkoutError ?? finalizeCheckoutError ?? createCheckoutError;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-8">Complete your enrollment for <strong className="text-foreground">{course.title}</strong></p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Payment form */}
          <div className="md:col-span-3 space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("stripe")}
                  className={`p-4 border rounded-lg flex items-center gap-2 transition-colors ${paymentMethod === "stripe" ? "border-primary bg-accent" : "border-border bg-card"}`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === "stripe" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${paymentMethod === "stripe" ? "text-primary" : "text-card-foreground"}`}>
                    Stripe
                  </span>
                </button>
                <button
                  onClick={() => setPaymentMethod("bank")}
                  className={`p-4 border rounded-lg flex items-center gap-2 transition-colors ${paymentMethod === "bank" ? "border-primary bg-accent" : "border-border bg-card"}`}
                >
                  <Building2 className={`w-5 h-5 ${paymentMethod === "bank" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${paymentMethod === "bank" ? "text-primary" : "text-card-foreground"}`}>
                    Bank Transfer
                  </span>
                </button>
              </div>
            </div>

            {paymentMethod === "stripe" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Card Number</Label>
                  <Input placeholder="4242 4242 4242 4242" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-foreground">Expiry</Label>
                    <Input placeholder="MM/YY" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">CVC</Label>
                    <Input placeholder="123" />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "bank" && (
              <div className="p-4 bg-accent rounded-lg">
                <p className="text-sm text-accent-foreground">
                  Please transfer <strong>£{coursePrice}</strong> to the following account and use your email as reference:
                </p>
                <div className="mt-3 text-sm text-muted-foreground space-y-1">
                  <p><strong className="text-foreground">Bank:</strong> InsideOutProgramme Bank</p>
                  <p><strong className="text-foreground">Sort Code:</strong> 12-34-56</p>
                  <p><strong className="text-foreground">Account:</strong> 12345678</p>
                </div>
              </div>
            )}

            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
              size="lg"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : `Pay with Stripe £${coursePrice}`}
            </Button>

            {effectiveCheckoutError && (
              <p className="text-sm text-destructive">{effectiveCheckoutError}</p>
            )}
          </div>

          {/* Order summary */}
          <div className="md:col-span-2">
            <div className="p-5 bg-card border border-border rounded-lg sticky top-24">
              <h3 className="font-semibold text-card-foreground mb-4">Order Summary</h3>
              <div className="flex gap-3 mb-4">
                <img
                  src={course.image_url ?? "/media/defaults/course-default.png"}
                  alt={course.title}
                  className="w-16 h-16 rounded-md object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-card-foreground">{course.title}</p>
                  <p className="text-xs text-muted-foreground">InsideOut Course</p>
                </div>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Course fee</span>
                  <span className="text-card-foreground">£{coursePrice}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-card-foreground">Total</span>
                  <span className="text-primary">£{coursePrice}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={handleCloseSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <DialogTitle className="text-xl">Payment Successful!</DialogTitle>
            <DialogDescription className="text-center">
              Thank you for enrolling in <strong className="text-foreground">{course.title}</strong>. 
              Let's schedule your onboarding session with your tutor.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-accent/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong className="text-foreground">Next step:</strong> Book your first one-on-one meeting with your tutor.
            </p>
            <p>This introductory session will help you get started with the course and set your learning goals.</p>
          </div>
          <Button onClick={handleContinueToBooking} className="w-full">
            Continue to Book Meeting
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;
