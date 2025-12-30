export type Product = {
  id: string;
  name: string;
  description: string;
  /** Price in smallest units for XTR (Stars x100) */
  amount: number;
};

export const PRODUCTS: Product[] = [
  {
    id: "pro_pack",
    name: "Pro Pack",
    description:
      "Unlock advanced features, priority support, and exclusive updates.",
    amount: 9900
  },
  {
    id: "template_set",
    name: "Template Set",
    description:
      "A curated set of production-ready templates to accelerate delivery.",
    amount: 14900
  },
  {
    id: "premium_content",
    name: "Premium Content",
    description:
      "Access premium tutorials, guides, and insider best practices.",
    amount: 19900
  },
  {
    id: "dev_toolkit",
    name: "Developer Toolkit",
    description:
      "Performance tools, diagnostics, and automation scripts for teams.",
    amount: 24900
  }
];

