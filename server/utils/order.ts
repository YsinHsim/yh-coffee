import { z } from "zod";

export const formatRM = (cents: number) =>
  `RM${(cents / 100).toFixed(2)}`;

export const orderSchema = z.object({
  customerName: z.string().max(80).default(""),
  note: z.string().max(500).default(""),
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1),
});
