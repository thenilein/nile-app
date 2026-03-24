export interface Outlet {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
  distance_km: number;
  is_serviceable: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  displayName: string;
}
