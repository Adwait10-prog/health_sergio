// Numbers logged over WhatsApp and shown in Today's five-number strip.
export const METRIC_KEYS = ["reliance", "demos", "ferritin"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export function isMetricKey(k: string): k is MetricKey {
  return (METRIC_KEYS as readonly string[]).includes(k);
}
