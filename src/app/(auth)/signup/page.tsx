"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { UserCircle2 } from "lucide-react";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { agree: false },
  });

  const agree = watch("agree");

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(values: SignupInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, profileImage: preview }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Could not create account");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (signInRes?.error) {
        toast.success("Account created — please log in");
        router.push("/login");
        return;
      }

      toast.success("Account created!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Set up your workspace in a couple of minutes.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-8 w-8 text-muted" />
            )}
          </div>
          <div>
            <Label htmlFor="profileImage" className="cursor-pointer text-sm text-primary">
              Upload profile picture
            </Label>
            <input id="profileImage" type="file" accept="image/*" onChange={handleImage} className="hidden" />
            <p className="text-xs text-muted">Optional · PNG or JPG</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && <p className="text-xs text-danger">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && <p className="text-xs text-danger">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" {...register("companyName")} />
            {errors.companyName && <p className="text-xs text-danger">{errors.companyName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobPosition">Job position</Label>
            <Input id="jobPosition" {...register("jobPosition")} />
            {errors.jobPosition && <p className="text-xs text-danger">{errors.jobPosition.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-xs text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pin">6-digit security PIN</Label>
            <Input
              id="pin"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              {...register("pin")}
            />
            {errors.pin && <p className="text-xs text-danger">{errors.pin.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPin">Confirm PIN</Label>
            <Input
              id="confirmPin"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              {...register("confirmPin")}
            />
            {errors.confirmPin && <p className="text-xs text-danger">{errors.confirmPin.message}</p>}
          </div>
        </div>
        <p className="text-xs text-muted">
          Your PIN is required to delete records, change security settings, or export data. It's
          stored hashed and never shown in plain text.
        </p>

        <div className="flex items-start gap-2.5">
          <Checkbox
            id="agree"
            checked={agree}
            onCheckedChange={(v) => setValue("agree", v === true, { shouldValidate: true })}
          />
          <Label htmlFor="agree" className="text-xs font-normal leading-snug text-muted">
            I agree to the Terms of Service and Privacy Policy.
          </Label>
        </div>
        {errors.agree && <p className="-mt-3 text-xs text-danger">{errors.agree.message}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
