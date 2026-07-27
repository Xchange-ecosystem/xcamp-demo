import React from "react";
import { LineChart, BarChart, DataTable, KpiCard, RubricMini } from "@xchange/ui";
import type { ComponentPayload } from "./component-contract";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, React.ComponentType<any>> = {
  line_chart: LineChart,
  bar_chart: BarChart,
  data_table: DataTable,
  kpi_card: KpiCard,
  rubric_mini: RubricMini,
};

export function ComponentRenderer({ payload }: { payload: ComponentPayload }) {
  const Cmp = REGISTRY[payload.component_type];
  if (!Cmp) return null;
  return <Cmp {...payload.props} gravity={payload.gravity} title={payload.title} />;
}
