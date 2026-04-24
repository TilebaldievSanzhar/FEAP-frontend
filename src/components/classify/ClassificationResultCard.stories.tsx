import type { Meta, StoryObj } from "@storybook/react";
import { ClassificationResultCard } from "./ClassificationResultCard";
import type { ClassificationResult } from "@/api/types";

const baseResult: ClassificationResult = {
  final_code: "8509800000",
  code_formatted: "8509 80 000 0",
  code_description: "Прочие электробытовые приборы",
  classification_chain: [
    { level: "section", code: "XVI", name: "Машины, оборудование, механизмы", confidence: 0.98 },
    { level: "group", code: "85", name: "Электрические машины и оборудование", confidence: 0.97 },
    { level: "position", code: "8509", name: "Электробытовые приборы", confidence: 0.9 },
    { level: "subposition", code: "850980", name: "Прочие", confidence: 0.85 },
    { level: "code_10", code: "8509800000", name: "Прочие", confidence: 0.82 },
  ],
  duty_rate: "10%",
  vat_rate: "12%",
  excise_rate: null,
  confidence: 0.82,
  risk_flags: [],
  requires_human_review: false,
  opi_applied: ["1"],
};

const meta: Meta<typeof ClassificationResultCard> = {
  title: "Classify/ClassificationResultCard",
  component: ClassificationResultCard,
};

export default meta;

type Story = StoryObj<typeof ClassificationResultCard>;

export const HighConfidence: Story = {
  args: { result: baseResult },
};

export const LowConfidenceWithRisks: Story = {
  args: {
    result: {
      ...baseResult,
      confidence: 0.42,
      risk_flags: ["OPI 3б применено", "Материальный состав неточен"],
      requires_human_review: true,
      opi_applied: ["1", "3б"],
    },
  },
};

export const WithoutExcise: Story = {
  args: {
    result: { ...baseResult, excise_rate: "300 сом/литр" },
  },
};
