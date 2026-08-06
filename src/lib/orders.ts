/** Resolves a submitted order's fieldValues (keyed by field id) to readable label/value pairs. */
export function resolveFieldValues(
  fieldValues: unknown,
  fields: { id: string; label: string }[],
): { label: string; value: string }[] {
  if (!fieldValues || typeof fieldValues !== "object") return [];

  const labelById = new Map(fields.map((field) => [field.id, field.label]));

  return Object.entries(fieldValues as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([id, value]) => ({
      label: labelById.get(id) ?? id,
      value: String(value),
    }));
}
