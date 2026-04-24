import type { Meta, StoryObj } from "@storybook/react";
import { NeedsInputDialog } from "./NeedsInputDialog";
import type { ClassifyNeedsInput } from "@/api/types";

const data: ClassifyNeedsInput = {
  status: "needs_input",
  session_id: "sess-abc",
  answers_used: 1,
  answers_limit: 3,
  partial: {
    partial_code: "8509",
    missing_parameters: ["мощность электродвигателя"],
    questions: ["Укажите мощность в кВт"],
    classification_chain_so_far: [
      { level: "section", code: "XVI" },
      { level: "group", code: "85" },
      { level: "position", code: "8509" },
    ],
  },
};

const meta: Meta<typeof NeedsInputDialog> = {
  title: "Classify/NeedsInputDialog",
  component: NeedsInputDialog,
};

export default meta;

type Story = StoryObj<typeof NeedsInputDialog>;

export const FirstAttempt: Story = {
  args: {
    open: true,
    data,
    onOpenChange: () => undefined,
    onSubmit: async () => undefined,
  },
};

export const LimitReached: Story = {
  args: {
    open: true,
    data: { ...data, answers_used: 3, answers_limit: 3 },
    onOpenChange: () => undefined,
    onSubmit: async () => undefined,
  },
};
