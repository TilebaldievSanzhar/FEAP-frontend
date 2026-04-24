import type { Meta, StoryObj } from "@storybook/react";
import { NtmMeasureCard } from "./NtmMeasureCard";
import type { NtmMeasure, NtmVerifiedMeasure } from "@/api/types";

const base: NtmMeasure = {
  id: "m-1",
  measure_type: "Технический регламент",
  measure_type_kind: 1,
  name: "ТР ТС 004/2011 — Безопасность низковольтного оборудования",
  qualifier: "Применяется к электрическим приборам, работающим при 50-1000 В AC.",
  legal_basis: "Решение Комиссии Таможенного союза № 768 от 16.08.2011",
  scope: "eaeu",
  status: "may_apply",
};

const meta: Meta<typeof NtmMeasureCard> = {
  title: "NTM/NtmMeasureCard",
  component: NtmMeasureCard,
};

export default meta;

type Story = StoryObj<typeof NtmMeasureCard>;

export const Lookup: Story = { args: { measure: base } };

export const VerifiedApplies: Story = {
  args: {
    measure: {
      ...base,
      status: "applies",
      reasoning: "Прибор работает от сети 220 В, попадает в диапазон 50–1000 В.",
    } satisfies NtmVerifiedMeasure,
  },
};

export const VerifiedDoesNotApply: Story = {
  args: {
    measure: {
      ...base,
      status: "does_not_apply",
      reasoning: "Устройство питается от батареек (<50 В), вне диапазона действия регламента.",
    } satisfies NtmVerifiedMeasure,
  },
};

export const VerifiedUncertain: Story = {
  args: {
    measure: {
      ...base,
      status: "uncertain",
      reasoning: "В описании товара не указано напряжение питания — требуется уточнение.",
    } satisfies NtmVerifiedMeasure,
  },
};
