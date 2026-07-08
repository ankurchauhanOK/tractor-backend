"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tractor, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter username and password.");
      return;
    }
    setLoading(true);
    // Simulate login
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    router.push("/");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-16">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-600">
              <Tractor className="size-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Inspection AI</h2>
              <p className="text-sm text-zinc-400">Factory Digitization Platform</p>
            </div>
          </div>
          <div className="space-y-4">
            <blockquote className="text-2xl font-light leading-relaxed text-zinc-300">
              &ldquo;Digitize paper inspection sheets in seconds. Reduce manual data entry by 90%.&rdquo;
            </blockquote>
            <div className="flex gap-2 text-sm text-zinc-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1">
                OCR-Powered
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1">
                Async Processing
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1">
                Audit Trail
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-600">
            &copy; 2026 Mahindra &amp; Mahindra Ltd.
          </p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="flex size-14 items-center justify-center rounded-xl bg-amber-600">
              <Tractor className="size-7 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Inspection AI</h2>
              <p className="text-sm text-zinc-400">Factory Digitization Platform</p>
            </div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="text-sm text-zinc-400">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-zinc-300">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="h-11 border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-600 focus:ring-amber-600/20"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-zinc-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-600 focus:ring-amber-600/20 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-600">
            &copy; 2026 Mahindra &amp; Mahindra Ltd.
          </p>
        </div>
      </div>
    </div>
  );
}
