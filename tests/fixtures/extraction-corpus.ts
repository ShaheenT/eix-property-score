export type CorpusCase = {
  name: string;
  url: string;
  expectedSource: string;
  expectedListingId: string;
};

export const EXTRACTION_CORPUS: CorpusCase[] = [
  {
    name: 'Property24 Nooitgedacht Village',
    url: 'https://www.property24.com/for-sale/nooitgedacht-village/stellenbosch/western-cape/14758/117562641?plId=2599060&plt=2&plsIds=2606541',
    expectedSource: 'property24',
    expectedListingId: '117562641',
  },
  {
    name: 'Private Property Franschhoek',
    url: 'https://www.privateproperty.co.za/for-sale/western-cape/boland/franschhoek/franschhoek/T5582432',
    expectedSource: 'private_property',
    expectedListingId: 'T5582432',
  },
  {
    name: 'Rawson Rondebosch',
    url: 'https://rawson.co.za/property/for-sale/constantia/1358643',
    expectedSource: 'rawson',
    expectedListingId: '1358643',
  },
  {
    name: 'Pam Golding Constantia Upper',
    url: 'https://www.pamgolding.co.za/property-details/house-for-sale-constantia-upper/kw1751291',
    expectedSource: 'pam_golding',
    expectedListingId: 'kw1751291',
  },
  {
    name: 'Seeff Green Point',
    url: 'https://www.seeff.com/results/residential/for-sale/cape-town/green-point/house/3399375/12-high-level-road/',
    expectedSource: 'seeff',
    expectedListingId: '3399375',
  },
  {
    name: 'RE/MAX Stellenbosch Farms',
    url: 'https://www.remax.co.za/property-for-sale-south-africa/western-cape/stellenbosch/stellenbosch-farms/5-bedroom-farm-for-sale-in-stellenbosch-farms-69925995',
    expectedSource: 'remax',
    expectedListingId: '69925995',
  },
  {
    name: 'Harcourts Camps Bay',
    url: 'https://www.harcourts.co.za/results/residential/for-sale/cape-town/camps-bay/house/3425930/62-geneva-drive/',
    expectedSource: 'harcourts',
    expectedListingId: '3425930',
  },
  {
    name: 'Century 21 Woodstock',
    url: 'https://www.century21.co.za/results/residential/for-sale/cape-town/woodstock/apartment/3439193/200-1-on-albert-1a-albert-road/',
    expectedSource: 'century21',
    expectedListingId: '3439193',
  },
  {
    name: 'Jawitz Clara Anna Fontein',
    url: 'https://m.jawitz.co.za/results/residential/for-sale/durbanville/clara-anna-fontein/house/3335363/',
    expectedSource: 'jawitz',
    expectedListingId: '3335363',
  },
];
