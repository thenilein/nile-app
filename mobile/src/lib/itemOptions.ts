export type ItemOptionRow = {
  id: string;
  product_id: string;
  option_type: string;
  label: string;
  price_delta: number;
  is_default: boolean;
  display_order: number;
};

export function groupItemOptionsByType(options: ItemOptionRow[]): Map<string, ItemOptionRow[]> {
  const m = new Map<string, ItemOptionRow[]>();
  for (const o of options) {
    const arr = m.get(o.option_type) ?? [];
    arr.push(o);
    m.set(o.option_type, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.display_order - b.display_order || a.label.localeCompare(b.label));
  }
  return m;
}

export function sortedOptionTypeEntries(groups: Map<string, ItemOptionRow[]>): [string, ItemOptionRow[]][] {
  return [...groups.entries()].sort((a, b) => {
    const minA = Math.min(...a[1].map((r) => r.display_order));
    const minB = Math.min(...b[1].map((r) => r.display_order));
    return minA - minB;
  });
}

/** Toppings / add-ons: multiple per type. Other types: single choice. */
export function isMultiSelectOptionType(optionType: string): boolean {
  return optionType === "topping" || optionType.endsWith("_multi");
}

export function formatOptionTypeHeading(optionType: string): string {
  return optionType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
