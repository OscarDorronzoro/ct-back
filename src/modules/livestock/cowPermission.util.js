// Permission a user lacks to change these fields of the cow form, or null.
// The collar is equipment (cows:assignCollar); everything else is cow data (cows:write).
export default function missingCowPermission(fields, permissions) {
  const required = new Set(fields.map((field) => (
    field === 'currentCollarId' ? 'cows:assignCollar' : 'cows:write')));

  return [...required].find((permission) => !permissions.includes(permission)) ?? null;
}
