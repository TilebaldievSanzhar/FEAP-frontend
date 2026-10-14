import { createFileRoute, redirect } from "@tanstack/react-router";

// v3: the main screen is «Расчёт по товару»; classification is its step 2.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/calc" });
  },
});
