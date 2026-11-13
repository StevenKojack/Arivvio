import type { PreparationTask } from '../vendor-operations/model';

export const priceModels = { quote: 'Request a quote', flat: 'Flat price', hourly: 'Hourly rate', per_guest: 'Per guest' } as const;
export type PriceModel = keyof typeof priceModels;
export type PackageFields = {
  name: string; description: string; inclusions: string[]; pricing_model: PriceModel;
  amount: number | null; minimum_hours: number | null; minimum_guests: number | null;
  active: boolean; display_order: number;
};
export type ServicePackage = PackageFields & { id: string; vendor_id: string; service_id: string; version: number };
export type ServiceChecklist = { vendor_id: string; service_id: string; tasks: string[]; version: number };

export function decimal(value: string, label: string, max = 9999999999.99, positive = false) {
  if (!value.trim()) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim()) || Number(value) > max || (positive && Number(value) === 0)) {
    throw Error(label + ' must be a valid ' + (positive ? 'positive' : 'nonnegative') + ' number with at most two decimal places.');
  }
  return Number(value);
}

export function pricingLabel(model: PriceModel, amount: number | null, hours?: number | null, guests?: number | null) {
  if (model === 'quote' || amount == null) return 'Request a quote';
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount);
  if (model === 'hourly') return money + ' per hour' + (hours ? ' · ' + hours + ' hour minimum' : '');
  if (model === 'per_guest') return money + ' per guest' + (guests ? ' · ' + guests + ' guest minimum' : '');
  return money + ' flat price';
}

export function serviceRate(service: { pricing_type: Exclude<PriceModel, 'quote'>; base_price: number | null; hourly_rate: number | null }) {
  return service.pricing_type === 'hourly' ? service.hourly_rate ?? service.base_price : service.base_price;
}

export function checklistAdditions(tasks: PreparationTask[], template: string[]) {
  const seen = new Set(tasks.map(task => task.title.trim()));
  return template.flatMap(value => {
    const title = value.trim();
    if (!title || seen.has(title)) return [];
    seen.add(title);
    return [{ title, done: false }];
  });
}

export type PackageSnapshot = Pick<ServicePackage,
  'id' | 'service_id' | 'name' | 'description' | 'inclusions' | 'pricing_model' |
  'amount' | 'minimum_hours' | 'minimum_guests'>;

export function samePackageSnapshot(left: PackageSnapshot | null, right: PackageSnapshot | null) {
  if (!left || !right) return left === right;
  const keys: (keyof PackageSnapshot)[] = [
    'id', 'service_id', 'name', 'description', 'inclusions', 'pricing_model',
    'amount', 'minimum_hours', 'minimum_guests',
  ];
  return keys.every(key => key === 'inclusions'
    ? left.inclusions.length === right.inclusions.length && left.inclusions.every((entry, index) => entry === right.inclusions[index])
    : left[key] === right[key]);
}
