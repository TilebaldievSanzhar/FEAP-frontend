import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/api/auth-api";
import { useAuthStore } from "@/stores/auth";
import { parseApiError } from "@/lib/errors";

interface LoginSearch {
  redirect?: string;
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const setSession = useAuthStore((s) => s.setSession);
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const session = await login.mutateAsync({ email, password });
      setSession(session);
      // Internal paths only (may carry a query, e.g. /calc?code=…); never //host.
      if (redirect?.startsWith("/") && !redirect.startsWith("//")) void navigate({ href: redirect });
      else void navigate({ to: "/declarations" });
    } catch (err) {
      setError(parseApiError(err).message);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{t("auth.loginTitle")}</h1>
        <p className="mt-1 text-[13px] text-[var(--text-subtle)]">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-[var(--primary)] underline">
            {t("auth.registerLink")}
          </Link>
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">{t("auth.email")}</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[38px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">{t("auth.password")}</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-[38px]"
          />
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--danger-tint)] px-3 py-2 text-[12.5px] text-[var(--danger)]">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        ) : null}

        <Button type="submit" size="lg" className="justify-center" disabled={login.isPending}>
          {t("auth.submitLogin")}
        </Button>
      </form>

      <p className="text-center text-[11.5px] leading-relaxed text-[var(--text-faint)]">
        {t("auth.sessionHint")}
      </p>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});
