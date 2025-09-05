// A fixed taxonomy of categories for garage items. Keeping the list
// constrained helps maintain clean search results and avoids a flood of
// semi‑duplicate categories. Feel free to extend this list to suit your
// domain, but update the type alias accordingly.

export const CATEGORIES = [
  'Tools',
  'Fasteners',
  'Adhesives/Chemicals',
  'Electrical/Cords/Batteries',
  'Paint/Finishing',
  'Safety/PPE',
  'Lawn/Outdoor',
  'Automotive',
  'Hardware/Misc',
  'Resin-Bound Supplies',
] as const;

export type Category = typeof CATEGORIES[number];