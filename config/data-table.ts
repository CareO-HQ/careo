export const dataTableConfig = {
  operators: ["eq", "ne", "lt", "lte", "gt", "gte", "like", "notLike", "in", "notIn"] as const,
  filterVariants: ["text", "number", "select", "multiselect", "date", "range"] as const,
  joinOperators: ["and", "or"] as const,
};

export type DataTableConfig = typeof dataTableConfig;
