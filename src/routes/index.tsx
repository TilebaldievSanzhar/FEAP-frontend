import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";
import { SingleClassifyForm } from "@/components/classify/SingleClassifyForm";

function HomePage() {
  const { t } = useTranslation();
  return (
    <AppShell crumbs={[t("shell.crumbWork"), t("shell.navClassify")]}>
      <SingleClassifyForm />
    </AppShell>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
