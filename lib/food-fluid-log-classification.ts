/** Rolling window for food/fluid recording compliance (ms). */
export const FOOD_FLUID_ALERT_WINDOW_MS = 6 * 60 * 60 * 1000;

export const FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE = "food_fluid_not_recorded_6h" as const;

export type FoodFluidNotRecorded6hAlertType =
  typeof FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE;

export interface FoodFluidLogLike {
  fluid_consumed_ml?: number | null;
  type_of_food_drink?: string | null;
  amount_eaten?: string | null;
  timestamp?: string | null;
}

export function isFluidLogEntry(log: FoodFluidLogLike): boolean {
  if (typeof log.fluid_consumed_ml === "number" && log.fluid_consumed_ml > 0) {
    return true;
  }
  const type = (log.type_of_food_drink || "").toLowerCase();
  return ["water", "tea", "coffee", "juice", "milk"].includes(type);
}

export function isQualifyingFoodLog(log: FoodFluidLogLike): boolean {
  if (isFluidLogEntry(log)) {
    return false;
  }
  const eaten = (log.amount_eaten ?? "").trim();
  if (!eaten || eaten.toLowerCase() === "none") {
    return false;
  }
  return true;
}

/** Logs should already be restricted to the compliance window (e.g. last 6 hours). */
export function computeFoodFluidComplianceInWindow(
  logs: FoodFluidLogLike[]
): { foodOk: boolean; fluidOk: boolean } {
  let foodOk = false;
  let fluidOk = false;
  for (const log of logs) {
    if (isFluidLogEntry(log)) {
      fluidOk = true;
    }
    if (isQualifyingFoodLog(log)) {
      foodOk = true;
    }
    if (foodOk && fluidOk) {
      break;
    }
  }
  return { foodOk, fluidOk };
}
