/** Student `section` may be comma-separated; API may also return `sections` array. */

export function parseStudentSections(student: { section?: string | null; sections?: string[] }): string[] {
  if (Array.isArray(student.sections) && student.sections.length > 0) {
    return [...new Set(student.sections.map(s => String(s).trim()).filter(Boolean))];
  }
  const raw = (student.section ?? "").trim();
  if (!raw) return [];
  return [...new Set(raw.split(",").map(x => x.trim()).filter(Boolean))];
}

export function formatStudentSectionsDisplay(student: { section?: string | null; sections?: string[] }): string {
  const list = parseStudentSections(student);
  return list.length ? list.join(", ") : "–";
}

/** True if no sections selected, or student belongs to at least one selected section. */
export function studentMatchesAnySection(
  student: { section?: string | null; sections?: string[] },
  selectedSectionNames: string[],
): boolean {
  if (selectedSectionNames.length === 0) return true;
  const have = new Set(parseStudentSections(student));
  return selectedSectionNames.some((s) => have.has(s));
}
