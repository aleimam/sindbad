/** Client-side shapes of API payloads (missions & deals). */

export interface CountryRef {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface AccountRef {
  id: string;
  displayName: string;
  type?: 'PERSONAL' | 'COMMERCIAL';
}

export interface TripData {
  receivingStart: string | null;
  receivingEnd: string;
  tripDate?: string; // owner-only
  deliveryDate: string;
  deliveryLocation: string;
  receivingAddress?: string; // owner-only / revealed on agreed deals
  travelerCount: number;
  availableWeightKg: number;
  feeUsd: number | null;
  notes: string | null;
  allowedCategories?: Array<{ category?: { id: string; nameEn: string; nameAr: string } }>;
}

export interface ItemData {
  id: string;
  details: string;
  url: string | null;
  volumetricWeightKg: number;
  count: number;
  categoryId: string;
  declaredValueUsd: number | null;
  notes: string | null;
  category?: { id: string; nameEn: string; nameAr: string };
}

export interface ShipmentData {
  type: 'BOX' | 'BASKET';
  feeUsd: number | null;
  notes: string | null;
  items: ItemData[];
}

export interface Mission {
  id: string;
  kind: 'TRIP' | 'SHIPMENT';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | 'CLOSED';
  isCyclic: boolean;
  createdAt: string;
  origin: CountryRef;
  destination: CountryRef;
  account: AccountRef;
  trip?: TripData | null;
  shipment?: ShipmentData | null;
  isOwner?: boolean;
}

export interface MatchEntry {
  mission: Mission;
  askFlagged: boolean;
}

export interface DealEventData {
  id: string;
  type: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface Deal {
  id: string;
  status:
    | 'REQUESTED'
    | 'NEGOTIATING'
    | 'ONGOING'
    | 'ARRIVED_DESTINATION'
    | 'READY_FOR_PICKUP'
    | 'COMPLETED'
    | 'CANCELLED';
  ongoingStep:
    | 'ORDERED'
    | 'SHIPPED'
    | 'DELIVERED_TO_TRAVELER'
    | 'RECEIVED_BY_TRAVELER'
    | null;
  paymentMethod: 'CASH' | 'IN_APP';
  feeUsd: number;
  lastOfferByAccountId: string;
  travelerAccountId: string;
  shopperAccountId: string;
  tripMissionId: string;
  shipmentMissionId: string;
  createdAt: string;
  updatedAt: string;
  travelerAccount: AccountRef;
  shopperAccount: AccountRef;
  tripMission: Mission & { trip: TripData | null };
  shipmentMission: Mission & { shipment: ShipmentData | null };
  events?: DealEventData[];
}
