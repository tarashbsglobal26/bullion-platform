"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, AlertCircle, CheckCircle, Mail, ExternalLink, KeyRound } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  businessName: z.string().min(2, "Required"),
  legalName: z.string().min(2, "Required"),
  taxId: z.string().min(1, "Required"),
  registrationNo: z.string().optional(),
  businessEmail: z.string().email("Invalid email"),
  phone: z.string().min(7, "Required"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  street1: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Required"),
  country: z.string().min(2, "Required"),
  userName: z.string().min(2, "Required"),
  userEmail: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string().min(8, "Required"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;
type VerifyStage = "email" | "code" | "done";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [accountDone, setAccountDone] = useState(false);

  // Email verification state
  const [verifyStage, setVerifyStage] = useState<VerifyStage>("email");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting }, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // ── Email verification ──────────────────────────────────────────────────────

  const sendCode = async () => {
    setVerifyError("");
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setVerifyError("Please enter a valid email address.");
      return;
    }
    setSending(true);
    const res = await fetch("/api/auth/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      setVerifyStage("code");
    } else {
      setVerifyError("Failed to send code. Please try again.");
    }
  };

  const verifyCode = async () => {
    setVerifyError("");
    if (codeInput.length !== 6) {
      setVerifyError("Enter the 6-digit code from the email.");
      return;
    }
    setVerifying(true);
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput, code: codeInput }),
    });
    setVerifying(false);
    if (res.ok) {
      setVerifiedEmail(emailInput);
      setValue("userEmail", emailInput);
      setVerifyStage("done");
    } else {
      const data = await res.json();
      setVerifyError(data.error || "Verification failed.");
    }
  };

  // ── Account setup ───────────────────────────────────────────────────────────

  const proceedFromAccount = async () => {
    const valid = await trigger(["userName", "password", "confirmPassword"]);
    if (valid) setAccountDone(true);
  };

  // ── Business form ───────────────────────────────────────────────────────────

  const nextStep = async () => {
    const fields: (keyof FormData)[] = ["businessName", "legalName", "taxId", "businessEmail", "phone"];
    const valid = await trigger(fields);
    if (valid) setStep(2);
  };

  const onSubmit = async (data: FormData) => {
    setError("");
    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSuccess(true);
    } else {
      const body = await res.json();
      setError(body.error || "Registration failed");
    }
  };

  // ── Shared header ────────────────────────────────────────────────────────────

  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 mb-3">
        <Coins className="w-6 h-6 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-white">Register Your Business</h1>
      <p className="text-amber-300 text-sm">{subtitle}</p>
    </div>
  );

  // ── Success ──────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Registration Submitted</h2>
            <p className="text-gray-500 mb-6">Your application is under review. You will be notified once your KYC is approved.</p>
            <Link href="/login"><Button>Back to Login</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  // ── Stage 1: Email verification ──────────────────────────────────────────────

  if (verifyStage !== "done") {
    return (
      <Wrapper>
        <Header subtitle="First, verify your email address" />
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-600" />
              {verifyStage === "email" ? "Email Verification" : "Enter Your Code"}
            </CardTitle>
            <CardDescription>
              {verifyStage === "email"
                ? "We'll send a 6-digit code to confirm your email."
                : `A code was sent to ${emailInput}. Check your inbox.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifyError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {verifyError}
              </div>
            )}

            {verifyStage === "email" && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Your Email Address</label>
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendCode()}
                    placeholder="you@company.com"
                  />
                </div>
                <Button className="w-full" onClick={sendCode} disabled={sending}>
                  {sending ? "Sending…" : "Send Verification Code"}
                </Button>
              </>
            )}

            {verifyStage === "code" && (
              <>
                {previewUrl && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <ExternalLink className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-800">
                      Dev mode — view the email:{" "}
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="underline font-medium">
                        Open preview
                      </a>
                    </span>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">6-Digit Code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                    placeholder="123456"
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                <Button className="w-full" onClick={verifyCode} disabled={verifying}>
                  {verifying ? "Verifying…" : "Verify Code"}
                </Button>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-amber-600 w-full text-center"
                  onClick={() => { setVerifyStage("email"); setCodeInput(""); setPreviewUrl(""); }}
                >
                  Use a different email
                </button>
              </>
            )}

            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-amber-600 hover:underline font-medium">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  // ── Stage 2: Create login & password ─────────────────────────────────────────

  if (!accountDone) {
    return (
      <Wrapper>
        <Header subtitle="Create your login credentials" />
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Account Setup
            </CardTitle>
            <CardDescription>Choose a name and password for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={verifiedEmail}
                readOnly
                className="bg-green-50 border-green-300 text-green-800 cursor-not-allowed"
              />
              <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Verified
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Your Full Name</label>
              <Input {...register("userName")} placeholder="John Smith" />
              {errors.userName && <p className="text-red-500 text-xs mt-1">{errors.userName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input type="password" {...register("password")} placeholder="Min 8 characters" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <Input type="password" {...register("confirmPassword")} placeholder="Repeat your password" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <Button className="w-full" onClick={proceedFromAccount}>
              Continue
            </Button>
            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-amber-600 hover:underline font-medium">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  // ── Stage 3: Business details (steps 1–2) ────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 mb-3">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Register Your Business</h1>
          <p className="text-amber-300 text-sm">Step {step} of 2</p>
          <div className="flex gap-1 justify-center mt-2">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1.5 w-16 rounded-full ${s <= step ? "bg-amber-500" : "bg-gray-600"}`} />
            ))}
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>{step === 1 ? "Business Details" : "Business Address"}</CardTitle>
            <CardDescription>
              {step === 1 ? "Tell us about your company" : "Where is your business located?"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Trading Name</label>
                      <Input {...register("businessName")} placeholder="Acme Metals Ltd" />
                      {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Legal Name</label>
                      <Input {...register("legalName")} placeholder="Acme Metals LLC" />
                      {errors.legalName && <p className="text-red-500 text-xs mt-1">{errors.legalName.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tax ID / EIN</label>
                      <Input {...register("taxId")} placeholder="12-3456789" />
                      {errors.taxId && <p className="text-red-500 text-xs mt-1">{errors.taxId.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Registration No.</label>
                      <Input {...register("registrationNo")} placeholder="Optional" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Business Email</label>
                    <Input type="email" {...register("businessEmail")} placeholder="contact@company.com" />
                    {errors.businessEmail && <p className="text-red-500 text-xs mt-1">{errors.businessEmail.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <Input {...register("phone")} placeholder="+1 555 000 0000" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                  <Button type="button" className="w-full" onClick={nextStep}>Continue</Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Street Address</label>
                    <Input {...register("street1")} placeholder="123 Main Street" />
                    {errors.street1 && <p className="text-red-500 text-xs mt-1">{errors.street1.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">City</label>
                      <Input {...register("city")} placeholder="New York" />
                      {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Postal Code</label>
                      <Input {...register("postalCode")} placeholder="10001" />
                      {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">State/Province</label>
                      <Input {...register("state")} placeholder="NY" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Country</label>
                      <Input {...register("country")} placeholder="US" />
                      {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">By registering, you agree to our terms of service and undergo KYC verification.</p>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting…" : "Submit Application"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
