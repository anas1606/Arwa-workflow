export type CustomerBrand = {
  id: string;
  name: string;
  /** Panel sticker options available for this brand. */
  panelStickers: string[];
};

export type Customer = {
  id: string;
  name: string;
  code: string;
  region: string;
  brands: CustomerBrand[];
};

export const CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Acme Industrial',
    code: 'ACME',
    region: 'North',
    brands: [
      {
        id: 'b-acme-1',
        name: 'Acme Pro',
        panelStickers: ['None', 'Logo only', 'Full branding', 'Warning labels'],
      },
      {
        id: 'b-acme-2',
        name: 'Acme Lite',
        panelStickers: ['None', 'Logo only', 'Customer artwork'],
      },
    ],
  },
  {
    id: 'c2',
    name: 'Northline Parts',
    code: 'NRL',
    region: 'Midwest',
    brands: [
      {
        id: 'b-nrl-1',
        name: 'Northline OEM',
        panelStickers: ['None', 'Logo only', 'Full branding'],
      },
      {
        id: 'b-nrl-2',
        name: 'Private label',
        panelStickers: ['None', 'Customer artwork', 'Warning labels'],
      },
    ],
  },
  {
    id: 'c3',
    name: 'Vista Fabrication',
    code: 'VIST',
    region: 'West',
    brands: [
      {
        id: 'b-vist-1',
        name: 'Vista Standard',
        panelStickers: ['None', 'Logo only', 'Full branding', 'Customer artwork'],
      },
    ],
  },
  {
    id: 'c4',
    name: 'Summit OEM',
    code: 'SMMT',
    region: 'South',
    brands: [
      {
        id: 'b-smmt-1',
        name: 'Summit',
        panelStickers: ['None', 'Logo only'],
      },
      {
        id: 'b-smmt-2',
        name: 'OEM blank',
        panelStickers: ['None'],
      },
      {
        id: 'b-smmt-3',
        name: 'Private label',
        panelStickers: ['None', 'Customer artwork', 'Full branding'],
      },
    ],
  },
  {
    id: 'c5',
    name: 'Delta Works',
    code: 'DLTA',
    region: 'East',
    brands: [
      {
        id: 'b-dlta-1',
        name: 'Delta Core',
        panelStickers: ['None', 'Logo only', 'Warning labels'],
      },
    ],
  },
  {
    id: 'c6',
    name: 'Helix Robotics',
    code: 'HLX',
    region: 'West',
    brands: [
      {
        id: 'b-hlx-1',
        name: 'Helix',
        panelStickers: ['None', 'Logo only', 'Full branding'],
      },
      {
        id: 'b-hlx-2',
        name: 'Helix Partner',
        panelStickers: ['None', 'Customer artwork'],
      },
    ],
  },
  {
    id: 'c7',
    name: 'Orbital Systems',
    code: 'ORB',
    region: 'North',
    brands: [
      {
        id: 'b-orb-1',
        name: 'Orbital',
        panelStickers: ['None', 'Logo only', 'Full branding', 'Warning labels'],
      },
    ],
  },
  {
    id: 'c8',
    name: 'Prime Castings',
    code: 'PRME',
    region: 'Midwest',
    brands: [
      {
        id: 'b-prme-1',
        name: 'Prime',
        panelStickers: ['None', 'Logo only'],
      },
      {
        id: 'b-prme-2',
        name: 'Arwa co-brand',
        panelStickers: ['None', 'Logo only', 'Full branding', 'Customer artwork'],
      },
    ],
  },
];

export function getCustomerById(id: string) {
  return CUSTOMERS.find((c) => c.id === id);
}

export function getCustomerBrands(customerId: string | null | undefined) {
  if (!customerId) return [];
  return getCustomerById(customerId)?.brands ?? [];
}

export function getBrandByName(
  customerId: string | null | undefined,
  brandName: string | null | undefined,
) {
  if (!customerId || !brandName) return undefined;
  return getCustomerBrands(customerId).find((b) => b.name === brandName);
}

export function getPanelStickersForBrand(
  customerId: string | null | undefined,
  brandName: string | null | undefined,
) {
  return getBrandByName(customerId, brandName)?.panelStickers ?? [];
}

export function cloneCustomers(list: Customer[]): Customer[] {
  return list.map((c) => ({
    ...c,
    brands: c.brands.map((b) => ({
      ...b,
      panelStickers: [...b.panelStickers],
    })),
  }));
}
