import { createFileRoute } from "@tanstack/react-router";
import { SingleClassifyForm } from "@/components/classify/SingleClassifyForm";

function HomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <SingleClassifyForm />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
