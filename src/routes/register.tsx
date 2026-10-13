import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/api/auth-api";
import { useAuthStore } from "@/stores/auth";
import { parseApiError } from "@/lib/errors";

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const register = useRegister();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const session = await register.mutateAsync({
        email,
        password,
        name: name.trim() || null,
        org_name: orgName.trim() || null,
      });
      setSession(session);
      void navigate({ to: "/declarations" });
    } catch (err) {
      setError(parseApiError(err).message);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{t("auth.registerTitle")}</h1>
        <p className="mt-1 text-[13px] text-[var(--text-subtle)]">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="text-[var(--primary)] underline">
            {t("auth.loginLink")}
          </Link>
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-email">{t("auth.email")}</Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[38px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-password">{t("auth.password")}</Label>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-[38px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-name">
            {t("auth.name")}{" "}
            <span className="font-normal text-[var(--text-faint)]">{t("auth.optional")}</span>
          </Label>
          <Input
            id="reg-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-[38px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-org">
            {t("auth.orgName")}{" "}
            <span className="font-normal text-[var(--text-faint)]">{t("auth.optional")}</span>
          </Label>
          <Input
            id="reg-org"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="h-[38px]"
          />
          <p className="text-[11px] text-[var(--text-faint)]">{t("auth.orgNameHint")}</p>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--danger-tint)] px-3 py-2 text-[12.5px] text-[var(--danger)]">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        ) : null}

        <Button type="submit" size="lg" className="justify-center" disabled={register.isPending}>
          {t("auth.submitRegister")}
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});
