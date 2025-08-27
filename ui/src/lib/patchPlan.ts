import { applyPatch, Operation } from 'fast-json-patch';

export const patchPlan = <T>(plan: T, ops: Operation[]): T => {
  const result = applyPatch(structuredClone(plan), ops, true, false);
  return result.newDocument as T;
};
