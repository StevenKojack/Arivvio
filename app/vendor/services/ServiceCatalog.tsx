'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { allServices, eventTypes } from '@/app/data/marketplace';
import { PackageOfferings } from '@/app/marketplace/components/ServicePackages';
import { BusinessWorkspace } from '@/app/vendor/BusinessWorkspace';
import { listServiceChecklists, listServicePackages, saveServiceChecklist, saveServicePackage } from '@/lib/repositories/serviceCatalogRepository';
import { getVendorServicesByVendorIds } from '@/lib/repositories/vendorsRepository';
import { decimal, pricingLabel, priceModels, serviceRate, type PriceModel, type ServiceChecklist, type ServicePackage } from '@/lib/service-catalog/model';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PublicTableRow } from '@/lib/supabase/database.types';

type Service = PublicTableRow<'vendor_services'>;
const path = '/vendor/services';
const panel = 'rounded-xl border ui-border ui-surface p-4';
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to save changes.';
const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const servicePricing = (service: Service) => pricingLabel(service.pricing_type, serviceRate(service), service.minimum_hours);

export function ServiceCatalog({ business }: { business?: string }) {
  return <BusinessWorkspace initial={business} title="Service catalog" path={path}>
    {id => <Catalog key={id} business={id}/>}
  </BusinessWorkspace>;
}

function Catalog({ business }: { business: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [templates, setTemplates] = useState<ServiceChecklist[]>([]);
  const [publicBusiness, setPublicBusiness] = useState(false);
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState('Service details');
  const [editing, setEditing] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let live = true;
    const db = createBrowserSupabaseClient();
    Promise.all([getVendorServicesByVendorIds(db, [business]), listServicePackages(business),
      listServiceChecklists(business), db.from('vendor_businesses').select('approval_status,owner_id,vacation_mode').eq('id', business).maybeSingle()])
      .then(([rows, offers, checklists, { data, error }]) => {
        if (error) throw Error(error.message);
        if (!live) return;
        setServices(rows);
        setPackages(offers);
        setTemplates(checklists);
        setPublicBusiness(Boolean(data?.approval_status === 'approved' && data.owner_id && !data.vacation_mode));
      }).catch(error => { if (live) setError(message(error)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [business]);

  const service = services.find(row => row.id === selected);
  const offers = packages.filter(row => row.service_id === selected);
  const template = templates.find(row => row.service_id === selected);
  function select(id: string) {
    setNotice('');
    setSelected(id);
    setTab('Service details');
    setEditing('');
  }
  if (loading) return <p role="status">Loading services…</p>;
  if (error) return <p role="alert">{error}</p>;
  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,2fr)]">
    <section className={panel + ' space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Services</h2>
        <button className="hub-primary" type="button" onClick={() => select('new')}>Add service</button></div>
      {!services.length && <p className="text-sm ui-muted">No services yet.</p>}
      {services.map(row => <button key={row.id} type="button" aria-pressed={selected === row.id}
        className="block w-full rounded-lg border ui-border p-3 text-left break-words aria-pressed:ring-2"
        onClick={() => select(row.id)}>
        <span className="block font-semibold">{row.service_name}</span>
        <span className="block text-sm ui-muted">{row.category} · {row.active ? 'Active' : 'Inactive'}</span>
        <span className="block text-sm">{servicePricing(row)} · {packages.filter(item => item.service_id === row.id).length} packages</span>
      </button>)}
    </section>
    {selected && <section className={panel + ' min-w-0 space-y-4'}>
      <h2 className="text-xl font-semibold break-words">{service?.service_name ?? 'New service'}</h2>
      {service && <nav aria-label="Service workspace" className="flex flex-wrap gap-2">
        {['Service details', 'Packages', 'Preparation', 'Preview'].map(name => <button key={name} type="button"
          className="hub-button aria-pressed:ring-2" aria-pressed={tab === name} onClick={() => { setNotice(''); setTab(name); }}>{name}</button>)}
      </nav>}
      {notice && <p role="status">{notice}</p>}
      {tab === 'Service details' && <ServiceForm key={selected} business={business} service={service} onSaved={row => {
        setServices(current => current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [...current, row]);
        if (!service) setNotice('Service created.');
        setSelected(row.id);
      }}/>}
      {service && tab === 'Packages' && <div className="space-y-3">
        <button type="button" className="hub-button" onClick={() => setEditing('new')}>Add package</button>
        {!offers.length && <p className="text-sm ui-muted">No packages yet.</p>}
        {offers.map(row => <button key={row.id} className="hub-button mr-2 max-w-full break-words" type="button"
          aria-pressed={editing === row.id} onClick={() => setEditing(row.id)}>{row.name} · {row.active ? 'Active' : 'Inactive'}</button>)}
        {editing && <PackageForm key={service.id + editing} service={service} item={offers.find(row => row.id === editing)} onSaved={row => {
          setPackages(current => current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [...current, row]);
          if (editing === 'new') setNotice('Package created.');
          setEditing(row.id);
        }}/>}
      </div>}
      {service && tab === 'Preparation' && <TemplateForm key={service.id} service={service} template={template}
        onSaved={row => setTemplates(current => [...current.filter(item => item.service_id !== row.service_id), row])}/>}
      {service && tab === 'Preview' && <div className="space-y-2">
        <p className="text-sm ui-muted">{publicBusiness && service.active ? 'Eligible for public display' : 'Private preview · Service is hidden from customers'}</p>
        <h3 className="font-semibold">{service.service_name}</h3>
        <p className="whitespace-pre-line break-words">{service.description}</p>
        <p>{servicePricing(service)}</p>
        <ServiceFees service={service}/>
        <PackageOfferings packages={offers}/>
      </div>}
    </section>}
  </div>;
}

export function ServiceFees({ service }: { service: Pick<Service, 'setup_fee' | 'travel_fee'> }) {
  const fees = [[service.setup_fee, 'Setup fee'], [service.travel_fee, 'Travel fee']] as const;
  return <>{fees.map(([value, label]) => value != null && value > 0 && <p key={label} className="text-sm">{label} · ${value}</p>)}</>;
}

function Label({ name, children }: { name: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1 text-sm">{name}{children}</label>;
}

function PricingFields({ model, setModel, amount, hours, guests, isPackage = false }: {
  model: PriceModel; setModel: (value: PriceModel) => void; amount?: number | null;
  hours?: number | null; guests?: number | null; isPackage?: boolean;
}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <Label name="Pricing model"><select name="model" className="hub-input" value={model} onChange={e => setModel(e.target.value as PriceModel)}>
      {Object.entries(priceModels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></Label>
    {model !== 'quote' && <Label name={model === 'per_guest' ? 'Rate per guest ($)' : model === 'hourly' ? 'Rate per hour ($)' : 'Flat amount ($)'}>
      <input key={model} name="amount" className="hub-input" type="number" min="0" step="0.01" required defaultValue={amount ?? ''}/>
    </Label>}
    {model === 'hourly' && <Label name="Minimum hours (optional)"><input name="hours" className="hub-input" type="number" min="0.01" max="999.99" step="0.01" defaultValue={hours ?? ''}/></Label>}
    {isPackage && model === 'per_guest' && <Label name="Minimum guests (optional)"><input name="guests" className="hub-input" type="number" min="1" max="1000000" step="1" defaultValue={guests ?? ''}/></Label>}
  </div>;
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', error: false });
  async function submit(event: FormEvent<HTMLFormElement>, save: (data: FormData) => Promise<void>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setFeedback({ text: '', error: false });
    try {
      await save(data);
      setFeedback({ text: 'Saved.', error: false });
    } catch (error) {
      setFeedback({ text: message(error), error: true });
    } finally {
      setBusy(false);
    }
  }
  return { busy, submit, feedback: <span role={feedback.error ? 'alert' : 'status'}>{feedback.text}</span> };
}

function ServiceForm({ business, service, onSaved }: { business: string; service?: Service; onSaved: (row: Service) => void }) {
  const [model, setModel] = useState<PriceModel>(service && serviceRate(service) !== null ? service.pricing_type : 'quote');
  const { busy, submit, feedback } = useSubmit();
  async function save(data: FormData) {
    const amount = model === 'quote' ? null : decimal(field(data, 'amount'), 'Price');
    if (model !== 'quote' && amount === null) throw Error('Enter a price or choose Request a quote.');
    const legacyHourly = model === 'hourly' && service?.pricing_type === 'hourly' && service.hourly_rate === null && service.base_price === amount;
    const values = {
      service_name: field(data, 'name'), category: field(data, 'category'),
      description: field(data, 'description') || null,
      event_types_supported: data.getAll('eventTypes').map(String),
      pricing_type: model === 'quote' ? service?.pricing_type ?? 'flat' : model,
      base_price: model === 'hourly' && !legacyHourly ? null : amount,
      hourly_rate: model === 'hourly' && !legacyHourly ? amount : null,
      minimum_hours: model === 'hourly' ? decimal(field(data, 'hours'), 'Minimum hours', 999.99, true) : null,
      setup_fee: decimal(field(data, 'setup'), 'Setup fee') ?? 0,
      travel_fee: decimal(field(data, 'travel'), 'Travel fee') ?? 0,
      active: data.has('active'),
    };
    if (!values.service_name || !values.category) throw Error('Enter a service name and choose its category.');
    if (service) {
      const savedTypes = service.event_types_supported;
      if (savedTypes.length === values.event_types_supported.length && savedTypes.every(type => values.event_types_supported.includes(type))) {
        values.event_types_supported = savedTypes;
      }
      const sameRate = amount === serviceRate(service) && (model === 'quote' || service.pricing_type === model);
      if (sameRate) {
        values.base_price = service.base_price;
        values.hourly_rate = service.hourly_rate;
        if (model !== 'hourly' || (values.minimum_hours === null && service.minimum_hours === 0)) values.minimum_hours = service.minimum_hours;
      }
    }
    const keys = (Object.keys(values) as (keyof typeof values)[]).filter(key => !service || JSON.stringify(values[key]) !== JSON.stringify(service[key]));
    if (!keys.length) return;
    const changes = Object.fromEntries(keys.map(key => [key, values[key]]));
    const before = service ? Object.fromEntries(keys.map(key => [key, service[key]])) : {};
    const id = service?.id ?? crypto.randomUUID();
    const db = createBrowserSupabaseClient();
    const { error } = await db.rpc('profile_workspace_edit', {
      operation: service ? 'service' : 'new_service', payload: { vendor_id: business, id, changes, before },
    });
    if (error) throw Error(error.message);
    const result = await db.from('vendor_services').select('*').eq('vendor_id', business).eq('id', id).single();
    if (result.error) throw Error('Service saved. Reload to view the current record.');
    onSaved(result.data);
  }
  return <form className="space-y-3" onSubmit={event => void submit(event, save)}>
    <Label name="Service name"><input required maxLength={200} name="name" defaultValue={service?.service_name} className="hub-input"/></Label>
    <Label name="Category"><select required name="category" className="hub-input" defaultValue={service?.category ?? ''}>
      <option value="">Choose a category</option>
      {[...new Set([...allServices, ...(service?.category ? [service.category] : [])])].map(category => <option key={category}>{category}</option>)}
    </select></Label>
    <Label name="Description"><textarea rows={3} name="description" defaultValue={service?.description ?? ''} className="hub-input"/></Label>
    <details><summary className="cursor-pointer">Event compatibility</summary>
      <div className="grid gap-2 py-2 sm:grid-cols-2">{[...new Set([...eventTypes, ...(service?.event_types_supported ?? [])])].map(type => <label key={type} className="flex items-center gap-2 text-sm">
        <input name="eventTypes" type="checkbox" value={type} defaultChecked={service?.event_types_supported?.includes(type)}/>{type}
      </label>)}</div>
    </details>
    <PricingFields model={model} setModel={setModel} amount={service && model === service.pricing_type ? serviceRate(service) : null} hours={service?.minimum_hours || null}/>
    <details><summary className="cursor-pointer">Setup and travel fees</summary>
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <Label name="Setup fee ($)"><input type="number" min="0" step="0.01" name="setup" className="hub-input" defaultValue={service?.setup_fee || ''}/></Label>
        <Label name="Travel fee ($)"><input type="number" min="0" step="0.01" name="travel" className="hub-input" defaultValue={service?.travel_fee || ''}/></Label>
      </div>
    </details>
    <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={service?.active ?? false}/>Active in Marketplace when the business is eligible</label>
    <div className="flex flex-wrap items-center gap-3"><button className="hub-primary" disabled={busy}>{service ? 'Save service' : 'Create service'}</button>{feedback}</div>
  </form>;
}

function OrderedItems({ label, items, change }: { label: string; items: string[]; change: (values: string[]) => void }) {
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    change(next);
  }
  return <fieldset className="space-y-2"><legend className="font-semibold">{label}</legend>
    {items.map((item, index) => <div key={index} className="flex flex-wrap items-center gap-2">
      <input aria-label={label + ' ' + (index + 1)} required maxLength={300} className="hub-input min-w-32 flex-1" value={item}
        onChange={event => change(items.map((value, i) => i === index ? event.target.value : value))}/>
      <button className="hub-button" type="button" aria-label={'Move item ' + (index + 1) + ' up'} disabled={!index} onClick={() => move(index, -1)}>↑</button>
      <button className="hub-button" type="button" aria-label={'Move item ' + (index + 1) + ' down'} disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
      <button className="hub-button" type="button" aria-label={'Remove item ' + (index + 1)} onClick={() => change(items.filter((_, i) => i !== index))}>Remove</button>
    </div>)}
    <button className="hub-button" type="button" disabled={items.length >= 100} onClick={() => change([...items, ''])}>Add item</button>
  </fieldset>;
}

function PackageForm({ service, item, onSaved }: { service: Service; item?: ServicePackage; onSaved: (row: ServicePackage) => void }) {
  const [model, setModel] = useState<PriceModel>(item?.pricing_model ?? 'quote');
  const [inclusions, setInclusions] = useState(item?.inclusions ?? []);
  const { busy, submit, feedback } = useSubmit();
  async function save(data: FormData) {
    const name = field(data, 'name');
    const amount = model === 'quote' ? null : decimal(field(data, 'amount'), 'Price');
    if (!name || inclusions.some(entry => !entry.trim())) throw Error('Enter a package name and fill in each inclusion.');
    if (model !== 'quote' && amount === null) throw Error('Enter a price or choose Request a quote.');
    const guests = model === 'per_guest' ? decimal(field(data, 'guests'), 'Minimum guests', 1000000, true) : null;
    const order = decimal(field(data, 'order'), 'Display order', 2147483647) ?? 0;
    if ((guests !== null && !Number.isInteger(guests)) || !Number.isInteger(order)) throw Error('Use whole numbers for guests and display order.');
    onSaved(await saveServicePackage(service.vendor_id, service.id, {
      name, amount, description: field(data, 'description'), inclusions: inclusions.map(entry => entry.trim()),
      pricing_model: model, minimum_hours: model === 'hourly' ? decimal(field(data, 'hours'), 'Minimum hours', 999.99, true) : null,
      minimum_guests: guests, active: data.has('active'), display_order: order,
    }, item));
  }
  return <form onSubmit={event => void submit(event, save)} className="space-y-3">
    <Label name="Package name"><input name="name" className="hub-input" required maxLength={200} defaultValue={item?.name}/></Label>
    <Label name="Short description"><textarea name="description" rows={2} maxLength={3000} className="hub-input" defaultValue={item?.description}/></Label>
    <PricingFields model={model} setModel={setModel} amount={item?.pricing_model === model ? item.amount : null}
      hours={item?.minimum_hours} guests={item?.minimum_guests} isPackage/>
    <OrderedItems label="Included features" items={inclusions} change={setInclusions}/>
    <Label name="Display order"><input name="order" className="hub-input max-w-32" type="number" step="1" min="0" defaultValue={item?.display_order ?? 0}/></Label>
    <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={item?.active ?? false}/>Active when parent service is public</label>
    <div className="flex flex-wrap items-center gap-3"><button className="hub-primary" disabled={busy}>Save package</button>{feedback}</div>
  </form>;
}

function TemplateForm({ service, template, onSaved }: { service: Service; template?: ServiceChecklist; onSaved: (row: ServiceChecklist) => void }) {
  const [tasks, setTasks] = useState(template?.tasks ?? []);
  const { busy, submit, feedback } = useSubmit();
  async function save() {
    if (tasks.some(entry => !entry.trim())) throw Error('Enter a name for each preparation task.');
    onSaved(await saveServiceChecklist(service.vendor_id, service.id, tasks.map(entry => entry.trim()), template));
  }
  return <form onSubmit={event => void submit(event, save)} className="space-y-3">
    <p className="text-sm ui-muted">Private checklist for events and bookings.</p>
    <OrderedItems label="Preparation tasks" items={tasks} change={setTasks}/>
    <div className="flex flex-wrap items-center gap-3"><button className="hub-primary" disabled={busy}>Save checklist</button>{feedback}</div>
  </form>;
}
