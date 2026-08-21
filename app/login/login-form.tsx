"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PathwayLogo } from "@/components/pathway-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#0E1220] px-5 py-10 md:px-8">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center">
          <PathwayLogo size={44} />
          <h1 className="mt-3 font-heading text-[26px] font-bold tracking-tight text-[#EDEFF7]">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[#8B93B0]">
            Sign in to continue your path
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-[0.5px] text-[#8B93B0]"
            >
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              disabled={loading}
              aria-invalid={!!error}
              className={cn(
                "h-11 min-h-11 rounded-xl border-[#2A2F4A] bg-[#1F2440] px-4 text-[15px] text-[#EDEFF7]",
                "placeholder:text-[#8B93B0]/70",
                "focus-visible:border-[#5EEAD4] focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/25",
                "disabled:opacity-60",
                error &&
                  "border-[#FB7185]/60 aria-invalid:border-[#FB7185] aria-invalid:ring-[#FB7185]/20",
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-[0.5px] text-[#8B93B0]"
            >
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              aria-invalid={!!error}
              className={cn(
                "h-11 min-h-11 rounded-xl border-[#2A2F4A] bg-[#1F2440] px-4 text-[15px] text-[#EDEFF7]",
                "placeholder:text-[#8B93B0]/70",
                "focus-visible:border-[#5EEAD4] focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/25",
                "disabled:opacity-60",
                error &&
                  "border-[#FB7185]/60 aria-invalid:border-[#FB7185] aria-invalid:ring-[#FB7185]/20",
              )}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 px-3 py-2.5 text-sm text-[#FB7185]"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "mt-2 h-11 min-h-11 w-full rounded-xl text-[15px] font-semibold",
              "bg-[#5EEAD4] text-[#0E1220] shadow-[0_0_24px_rgba(94,234,212,0.25)]",
              "hover:bg-[#5EEAD4]/90 hover:text-[#0E1220]",
              "focus-visible:border-[#5EEAD4] focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/35",
              "disabled:bg-[#2A2F4A] disabled:text-[#8B93B0] disabled:shadow-none",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
