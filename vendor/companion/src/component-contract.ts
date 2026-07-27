import { z } from "zod";

export const ComponentType = z.enum([
  "line_chart",
  "bar_chart",
  "data_table",
  "kpi_card",
  "rubric_mini",
]);

const BaseComponentSchema = z.object({
  component_id: z.string(),
  component_type: ComponentType,
  title: z.string().optional(),
  gravity: z.boolean().default(false),
  source: z
    .object({
      suggestion_id: z.string().optional(),
      objective_id: z.string().uuid().optional(),
    })
    .optional(),
});

export const SeriesChartPropsSchema = z.object({
  x_key: z.string(),
  series: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      color_token: z.string().optional(),
    }),
  ),
  data: z.array(z.record(z.union([z.string(), z.number()]))),
  y_label: z.string().optional(),
});

export const DataTablePropsSchema = z.object({
  columns: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      align: z.enum(["left", "right", "center"]).optional(),
    }),
  ),
  rows: z.array(z.record(z.any())),
  max_rows_visible: z.number().optional(),
});

export const KpiCardPropsSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
  unit: z.string().optional(),
  delta: z
    .object({
      value: z.number(),
      direction: z.enum(["up", "down", "flat"]),
    })
    .optional(),
});

export const RubricMiniPropsSchema = z.object({
  dimensions: z.array(
    z.object({
      label: z.string(),
      score_pct: z.number().min(0).max(100),
    }),
  ),
  overall_pct: z.number().min(0).max(100).optional(),
});

export const ComponentPayloadSchema = z.discriminatedUnion("component_type", [
  BaseComponentSchema.extend({
    component_type: z.literal("line_chart"),
    props: SeriesChartPropsSchema,
  }),
  BaseComponentSchema.extend({
    component_type: z.literal("bar_chart"),
    props: SeriesChartPropsSchema,
  }),
  BaseComponentSchema.extend({
    component_type: z.literal("data_table"),
    props: DataTablePropsSchema,
  }),
  BaseComponentSchema.extend({
    component_type: z.literal("kpi_card"),
    props: KpiCardPropsSchema,
  }),
  BaseComponentSchema.extend({
    component_type: z.literal("rubric_mini"),
    props: RubricMiniPropsSchema,
  }),
]);

export type ComponentPayload = z.infer<typeof ComponentPayloadSchema>;
