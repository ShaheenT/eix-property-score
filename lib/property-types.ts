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
  description?: string | null;
  primaryImageUrl?: string | null;

  // Verified Property24 fields
  leviesCents: number | null;
  ratesAndTaxesCents: number | null;
  garages: number | null;
  parking: number | null;
  hasStudy: boolean | null;
  hasPool: boolean | null;
  hasGarden: boolean | null;
  hasFibre: boolean | null;
  hasSolar: boolean | null;
  hasBatteryBackup: boolean | null;
  // Complete Property24-native evidence
  listingNumber?: string | null;
  listingDate?: string | null;
  kitchens?: number | null;
  receptionRooms?: number | null;
  petsAllowed?: boolean | null;
  parkingDetails?: string[];
  flooring?: string[];
  backupWater?: string[];
  backupPower?: string[];
  flatlet?: boolean | null;
  pointsOfInterest?: Array<{
    category: string | null;
    name: string;
    distanceKm: number;
  }>;
  property24MonthlyRepaymentCents?: number | null;
  property24OnceOffCostsCents?: number | null;
  property24MinimumGrossMonthlyIncomeCents?: number | null;

}

export interface PropertyEvidence {
  field: keyof PropertyFacts;
  value: string | number | boolean;
  source: 'json_ld' | 'open_graph' | 'meta' | 'html';
}
