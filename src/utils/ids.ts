// Short unique-enough ids for records created in the admin (categories, menu items). Not for security.
let counter = 0;

export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}
