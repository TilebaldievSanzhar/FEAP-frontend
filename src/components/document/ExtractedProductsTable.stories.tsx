import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";
import { ExtractedProductsTable } from "./ExtractedProductsTable";
import { useDraftStore, type DraftProduct } from "@/stores/draft";

const ocrJobId = "ocr-story";

const sample: DraftProduct[] = [
  {
    local_id: "r-1",
    normalized_description: "Электрическая зубная щётка Oral-B Pro 3 с ионной очисткой",
    material: "пластик ABS, силикон",
    function: "гигиена полости рта",
    quantity: 12,
    unit: "шт",
    country_of_origin: "Германия",
    hs_code_hint: "8509",
  },
  {
    local_id: "r-2",
    normalized_description: "Хлопковая ткань белая, ширина 150 см",
    material: "хлопок 100%",
    function: null,
    quantity: 300,
    unit: "м",
    country_of_origin: "Узбекистан",
    hs_code_hint: null,
  },
];

function WithDraft({ products, skipIdx }: { products: DraftProduct[]; skipIdx?: number }) {
  const initDraft = useDraftStore((s) => s.initDraft);
  const toggleSkip = useDraftStore((s) => s.toggleSkip);
  const clear = useDraftStore((s) => s.clearDraft);

  useEffect(() => {
    clear(ocrJobId);
    initDraft(ocrJobId, products);
    if (skipIdx != null) toggleSkip(ocrJobId, products[skipIdx].local_id);
    return () => clear(ocrJobId);
  }, [products, skipIdx, initDraft, toggleSkip, clear]);

  return <ExtractedProductsTable ocrJobId={ocrJobId} products={products} />;
}

const meta: Meta<typeof WithDraft> = {
  title: "Document/ExtractedProductsTable",
  component: WithDraft,
};

export default meta;

type Story = StoryObj<typeof WithDraft>;

export const Happy: Story = {
  args: { products: sample },
};

export const WithSkippedRow: Story = {
  args: { products: sample, skipIdx: 1 },
};

export const Empty: Story = {
  args: { products: [] },
};
