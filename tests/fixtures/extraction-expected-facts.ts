export type ExpectedCoreFacts = {
  titleContains?: string;
  propertyType?: string;
  askingPriceCents?: number;
  bedrooms?: number;
  bathrooms?: number;
  landSizeM2?: number;
  floorSizeM2?: number;
};

export const EXPECTED_CORE_FACTS: Record<string, ExpectedCoreFacts> = {
  'Property24 Nooitgedacht Village': { titleContains: '4 Bedroom House for Sale in Nooitgedacht Village', propertyType: 'House', askingPriceCents: 1725000000, bedrooms: 4, bathrooms: 4.5, landSizeM2: 956, floorSizeM2: 390 },
  'Private Property Franschhoek': { titleContains: '3 Bedroom House in Franschhoek', propertyType: 'House', askingPriceCents: 2645000000, bedrooms: 3, bathrooms: 3, landSizeM2: 1800 },
  'Rawson Rondebosch': { titleContains: '5 Bedroom house for sale in Rondebosch, Cape Town', propertyType: 'House', askingPriceCents: 1649500000, bedrooms: 5, bathrooms: 4, landSizeM2: 496, floorSizeM2: 390 },
  'Pam Golding Constantia Upper': { titleContains: 'House for Sale | Constantia Upper', propertyType: 'House', askingPriceCents: 2399500000, bedrooms: 2, bathrooms: 2, landSizeM2: 1801 },
  'Seeff Green Point': { titleContains: '5 Bedroom House For Sale in Green Point', propertyType: 'House', bedrooms: 5 },
};
