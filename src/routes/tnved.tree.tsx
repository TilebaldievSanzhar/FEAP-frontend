import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TreeBrowser } from "@/components/tnved/TreeBrowser";

function TreePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function onLookup(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length < 2) return;
    void navigate({ to: "/tnved/$code", params: { code: clean } });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("tree.title")}</CardTitle>
          <CardDescription>{t("tree.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={onLookup}>
            <Input
              inputMode="numeric"
              placeholder={t("tree.lookupPlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
              {t("tree.open")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.navTree")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TreeBrowser />
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/tnved/tree")({
  component: TreePage,
});
