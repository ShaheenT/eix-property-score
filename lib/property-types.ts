export interface PropertyFacts {
  title: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  askingPriceCents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  floorSizeM2: number | null;
  landSizeM2: number | null;
}

export interface PropertyEvidence {
  field: keyof PropertyFacts;
  value: string;
  source: 'json_ld' | 'open_graph' | 'meta' | 'html';
}
