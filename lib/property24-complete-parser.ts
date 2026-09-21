import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

export interface Property24PointOfInterest { category: string | null; name: string; distanceKm: number; }
export interface Property24RecentSaleRecord { address: string; priceCents: number | null; soldDate: string | null; sourceUrl: string | null; }
export interface Property24NarrativeClaim {
  type: 'income_use' | 'rental_use' | 'tenant' | 'studio_suites' | 'renovation' | 'heritage' | 'security' | 'development' | 'amenity' | 'other';
  text: string; verification: 'listing_claim';
}
export interface Property24EvidenceGraphNode { evidence: string; meaning: string; unknowns: string[]; action: string; protection: string; }
export interface Property24SourceDocument {
  source: 'property24'; canonicalSource: string; listingNumber: string | null; title: string | null;
  address: string | null; listingDate: string | null; description: string | null;
  claims: Property24NarrativeClaim[]; recentSales: Property24RecentSaleRecord[];
  sectionsPresent: string[]; evidenceGraph: Property24EvidenceGraphNode[];
}
export interface Property24ListingDetails {
  listingNumber: string | null; listingDate: string | null; kitchens: number | null; receptionRooms: number | null;
  petsAllowed: boolean | null; parkingDetails: string[]; flooring: string[]; backupWater: string[]; backupPower: string[];
  flatlet: boolean | null; pointsOfInterest: Property24PointOfInterest[];
  calculator: { monthlyRepaymentCents: number | null; onceOffCostsCents: number | null; minimumGrossMonthlyIncomeCents: number | null; };
  recentSales: Property24RecentSaleRecord[]; claims: Property24NarrativeClaim[]; description: string | null;
}

const SECTION_NAMES = ['Property Overview','Rooms','External Features','Building','Other Features','Points of Interest','Bond Calculator','Recent Sales in and around Woodstock','Trends and Statistics'];

function stripNonContent(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
}
function decode(value: string): string {
  return stripNonContent(value).replace(/&nbsp;|&#160;/gi,' ').replace(/&#xB2;|&#178;/gi,'²')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&#x27;/gi,"'")
    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function moneyCents(value: string): number | null {
  const n = Number(value.replace(/[^\d.]/g,''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function sectionText(normalized: string, heading: string): string {
  const start = normalized.toLowerCase().indexOf(heading.toLowerCase());
  if (start < 0) return '';
  const after = normalized.slice(start + heading.length);
  let end = after.length;
  for (const next of SECTION_NAMES) {
    if (next.toLowerCase() === heading.toLowerCase()) continue;
    const i = after.toLowerCase().indexOf(next.toLowerCase());
    if (i >= 0 && i < end) end = i;
  }
  return after.slice(0,end).trim();
}
function addEvidence(evidence: PropertyEvidence[], field: keyof PropertyFacts, value: string | number | boolean): void {
  evidence.push({ field, value, source: 'html' });
}
function unique<T>(items: T[], key: (item:T)=>string): T[] {
  const seen = new Set<string>(); return items.filter(item => { const k=key(item).toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
}

export function parseProperty24CompleteSections(body: string): {
  facts: Partial<PropertyFacts>; details: Property24ListingDetails; evidence: PropertyEvidence[]; sourceDocument: Property24SourceDocument;
} {
  const normalized = decode(body);
  const facts: Partial<PropertyFacts> = {};
  const evidence: PropertyEvidence[] = [];

  const listingId = normalized.match(/(?:Listing Number\s+|P24-)(\d{6,})/i)?.[1] ?? null;
  const listingDate = normalized.match(/Listing Date\s+(.+?)(?=\s+(?:Erf Size|Floor Size|Rates and Taxes|Levies|Pets Allowed|$))/i)?.[1]?.trim() ?? null;
  const title = decode(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '') || null;
  const address = normalized.match(/Street Address\s+(.+?)(?=\s+Listing Date\b)/i)?.[1]?.trim() ?? null;

  if (listingId) { facts.listingNumber=listingId; addEvidence(evidence,'listingNumber',listingId); }
  if (listingDate) { facts.listingDate=listingDate; addEvidence(evidence,'listingDate',listingDate); }
  if (title) { facts.title=title; addEvidence(evidence,'title',title); }
  if (address) { facts.address=address; addEvidence(evidence,'address',address); }

  const overview = sectionText(normalized,'Property Overview');
  const type = overview.match(/Type of Property\s+(.+?)(?=\s+(?:Street Address|Listing Date|Erf Size|Floor Size|Rates and Taxes|$))/i)?.[1]?.trim();
  if (type) { facts.propertyType=type; addEvidence(evidence,'propertyType',type); }

  const floor = overview.match(/Floor Size\s+([\d\s,.]+)\s*m(?:2|²)/i)?.[1];
  if (floor) { const n=Number(floor.replace(/[^\d.]/g,'')); if(Number.isFinite(n)) {facts.floorSizeM2=n;addEvidence(evidence,'floorSizeM2',floor);} }
  const erf = overview.match(/Erf Size\s+([\d\s,.]+)\s*m(?:2|²)/i)?.[1];
  if (erf) { const n=Number(erf.replace(/[^\d.]/g,'')); if(Number.isFinite(n)) {facts.landSizeM2=n;addEvidence(evidence,'landSizeM2',erf);} }
  const rates = overview.match(/Rates and Taxes\s+R\s*([\d\s,.]+)/i)?.[1];
  if (rates) { const n=moneyCents(rates); if(n!==null){facts.ratesAndTaxesCents=n;addEvidence(evidence,'ratesAndTaxesCents',rates);} }
  const levies = overview.match(/Levies\s+R\s*([\d\s,.]+)/i)?.[1];
  if (levies) { const n=moneyCents(levies); if(n!==null){facts.leviesCents=n;addEvidence(evidence,'leviesCents',levies);} }

  const rooms = sectionText(normalized,'Rooms');
  for (const [field,label] of [['bedrooms','Bedrooms'],['bathrooms','Bathrooms'],['kitchens','Kitchens'],['receptionRooms','Reception Rooms']] as const) {
    const m=rooms.match(new RegExp(label+'\\s+(\\d+(?:\\.\\d+)?)','i'));
    if(m){ const n=Number(m[1]); (facts as any)[field]=n; addEvidence(evidence,field as keyof PropertyFacts,m[1]); }
  }

  const calculator = sectionText(normalized,'Bond Calculator');
  const monthly = calculator.match(/Monthly Repayment\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  const onceOff = calculator.match(/Total Once-off Costs\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  const income = calculator.match(/Min Gross Monthly Income\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  if(monthly){const n=moneyCents(monthly);if(n!==null){facts.property24MonthlyRepaymentCents=n;addEvidence(evidence,'property24MonthlyRepaymentCents',monthly);}}
  if(onceOff){const n=moneyCents(onceOff);if(n!==null){facts.property24OnceOffCostsCents=n;addEvidence(evidence,'property24OnceOffCostsCents',onceOff);}}
  if(income){const n=moneyCents(income);if(n!==null){facts.property24MinimumGrossMonthlyIncomeCents=n;addEvidence(evidence,'property24MinimumGrossMonthlyIncomeCents',income);}}

  const poiText=sectionText(normalized,'Points of Interest');
  const pois: Property24PointOfInterest[]=[];
  for(const category of ['Shopping','Education','Transport and Public Services','Food and Entertainment']){
    const start=poiText.toLowerCase().indexOf(category.toLowerCase());
    if(start<0) continue;
    let block=poiText.slice(start+category.length);
    for(const other of ['Shopping','Education','Transport and Public Services','Food and Entertainment']) {
      if(other===category) continue;
      const i=block.toLowerCase().indexOf(other.toLowerCase()); if(i>=0) block=block.slice(0,i);
    }
    for(const m of block.matchAll(/([A-Za-z0-9][A-Za-z0-9'&()./ -]{2,80}?)\s+(\d+(?:\.\d+)?)\s*km\b/gi)){
      const name=m[1].trim(); if(name) pois.push({category,name,distanceKm:Number(m[2])});
    }
  }
  const uniquePois=unique(pois,p=>p.category+'|'+p.name+'|'+p.distanceKm);
  if(uniquePois.length){facts.pointsOfInterest=uniquePois;for(const p of uniquePois)addEvidence(evidence,'pointsOfInterest',p.name+' — '+p.distanceKm+' km');}

  const recentSales: Property24RecentSaleRecord[]=[];
  const salesStart=normalized.toLowerCase().indexOf('recent sales in and around');
  const salesEnd=normalized.toLowerCase().indexOf('trends and statistics',salesStart<0?0:salesStart);
  const salesText=salesStart>=0?normalized.slice(salesStart,salesEnd>=0?salesEnd:undefined):'';
  for(const m of body.matchAll(/<a\b[^>]*href=["']([^"']*(?:property-values|property-value)[^"']*)["'][^>]*>\s*([^<]+?)\s*<\/a>/gi)){
    const saleAddress=decode(m[2]);
    if(saleAddress && salesText.toLowerCase().includes(saleAddress.toLowerCase())) recentSales.push({address:saleAddress,priceCents:null,soldDate:null,sourceUrl:m[1]});
  }
  if(!recentSales.length){
    for(const m of salesText.matchAll(/\b(\d+\s+[A-Za-z0-9' .-]+?\s+(?:Street|Road|Avenue|Rd|St|Ave))\b/gi)) recentSales.push({address:m[1].trim(),priceCents:null,soldDate:null,sourceUrl:null});
  }
  const uniqueSales=unique(recentSales,s=>s.address);
  if(uniqueSales.length)addEvidence(evidence,'property24RecentSales',JSON.stringify(uniqueSales));

  const description = (normalized.match(/(?:Positioned|Situated|Located)\s+[\s\S]*?(?=\s+Property Overview\b)/i)
    ?? normalized.match(/(?:4|\d+)\s+(?:individual\s+)?studio\s+suites?[\s\S]*?(?=\s+Property Overview\b)/i))?.[0]?.trim() ?? null;
  if(description){facts.description=description;addEvidence(evidence,'description',description);}

  const claims: Property24NarrativeClaim[]=[];
  const addClaim=(type:Property24NarrativeClaim['type'],pattern:RegExp)=>{const m=description?.match(pattern);if(m?.[0])claims.push({type,text:m[0].trim(),verification:'listing_claim'});};
  addClaim('studio_suites',/(?:four|4)\s+(?:individual\s+)?studio\s+suites?[\s\S]*?(?=\.|$)/i);
  addClaim('rental_use',/(?:three|3)\s+(?:of\s+the\s+)?suites?\s+(?:operate|are)\s+as\s+(?:curated\s+)?Airbnb[\s\S]*?(?=\.|$)/i);
  addClaim('tenant',/fourth\s+(?:suite|unit)\s+is\s+(?:secured\s+with\s+)?a\s+long-term\s+tenant[\s\S]*?(?=\.|$)/i);
  addClaim('income_use',/income\s+potential/i);
  addClaim('heritage',/heritage|Victorian|period\s+character/i);
  addClaim('renovation',/reimagined|renovat(?:ed|ion)/i);
  if(claims.length){facts.property24NarrativeClaims=claims;addEvidence(evidence,'property24NarrativeClaims',JSON.stringify(claims));}

  const evidenceGraph: Property24EvidenceGraphNode[]=[];
  const incomeClaims=claims.filter(c=>['income_use','rental_use','tenant','studio_suites'].includes(c.type)).map(c=>c.text).join(' ');
  if(incomeClaims)evidenceGraph.push({evidence:incomeClaims,meaning:'The Property24 listing describes an income-use configuration.',unknowns:['Actual gross rental/Airbnb revenue','Occupancy history','Operating expenses','Planning/zoning permission','Approved plans','Applicable compliance certificates'],action:'Request 6–12 months revenue and occupancy evidence, operating expenses, approved plans and confirmation of lawful use.',protection:'Do not price the income proposition into an offer until the underlying financial and legal evidence is reviewed.'});
  if(uniqueSales.length)evidenceGraph.push({evidence:`Property24 identifies ${uniqueSales.length} recent-sale records.`,meaning:'The source page provides candidate market evidence that may be useful for comparable research.',unknowns:['Sold prices','Sold dates','Comparable property characteristics','Similarity to the subject property'],action:'Retrieve and verify each linked sold-price record before using it in the achieved-sale benchmark.',protection:'Do not count a source-listed recent-sale record as a verified achieved-sale comparable until its underlying evidence is established.'});

  const sourceDocument:Property24SourceDocument={
    source:'property24',canonicalSource:'Property24',listingNumber:listingId,title,address,listingDate,description,claims,recentSales:uniqueSales,
    sectionsPresent:SECTION_NAMES.filter(s=>normalized.toLowerCase().includes(s.toLowerCase())),evidenceGraph,
  };

  return {facts,details:{listingNumber:listingId,listingDate,kitchens:typeof facts.kitchens==='number'?facts.kitchens:null,receptionRooms:typeof facts.receptionRooms==='number'?facts.receptionRooms:null,petsAllowed:null,parkingDetails:[],flooring:[],backupWater:[],backupPower:[],flatlet:null,pointsOfInterest:uniquePois,calculator:{monthlyRepaymentCents:facts.property24MonthlyRepaymentCents??null,onceOffCostsCents:facts.property24OnceOffCostsCents??null,minimumGrossMonthlyIncomeCents:facts.property24MinimumGrossMonthlyIncomeCents??null},recentSales:uniqueSales,claims,description},evidence,sourceDocument};
}
