do $$
declare
  seed_owner uuid;
  venue_vendor uuid;
  dj_vendor uuid;
  catering_vendor uuid;
  booth_vendor uuid;
  rentals_vendor uuid;
  flowers_vendor uuid;
  cake_vendor uuid;
  security_vendor uuid;
  music_vendor uuid;
  magic_vendor uuid;
  character_vendor uuid;
begin
  select id into seed_owner
  from public.profiles
  order by created_at
  limit 1;

  if seed_owner is null then
    raise exception 'Create at least one Arivvio user/profile before running seed-demo-data.sql.';
  end if;

  delete from public.vendor_businesses
  where owner_id = seed_owner
    and business_name in (
      'Arivvio Demo Venue',
      'Arivvio Demo DJ',
      'Arivvio Demo Catering',
      'Arivvio Demo Photo Booth',
      'Arivvio Demo Rentals',
      'Arivvio Demo Flowers',
      'Arivvio Demo Cake',
      'Arivvio Demo Security',
      'Arivvio Demo Live Music',
      'Arivvio Demo Magic',
      'Arivvio Demo Characters'
    );

  insert into public.vendor_businesses (
    owner_id,
    business_name,
    description,
    category,
    service_area_city,
    service_radius_miles,
    base_address,
    latitude,
    longitude,
    approval_status,
    website_url,
    vacation_mode
  )
  values
    (seed_owner, 'Arivvio Demo Venue', 'Flexible event venue for social and business gatherings.', 'Venue', 'Los Angeles', 35, 'Los Angeles, CA', 34.0522, -118.2437, 'approved', 'https://example.com/demo-venue', false),
    (seed_owner, 'Arivvio Demo DJ', 'DJ and MC services for celebrations and private events.', 'DJ', 'Los Angeles', 40, 'Los Angeles, CA', 34.0522, -118.2537, 'approved', 'https://example.com/demo-dj', false),
    (seed_owner, 'Arivvio Demo Catering', 'Buffet and plated catering packages.', 'Catering', 'Los Angeles', 35, 'Los Angeles, CA', 34.0622, -118.2437, 'approved', 'https://example.com/demo-catering', false),
    (seed_owner, 'Arivvio Demo Photo Booth', 'Open-air booth and digital gallery packages.', 'Photo Booth', 'Los Angeles', 30, 'Los Angeles, CA', 34.0422, -118.2337, 'approved', 'https://example.com/demo-photo-booth', false),
    (seed_owner, 'Arivvio Demo Rentals', 'Tables, chairs, lounge, and party rental bundles.', 'Rentals', 'Los Angeles', 45, 'Los Angeles, CA', 34.0722, -118.2637, 'approved', 'https://example.com/demo-rentals', false),
    (seed_owner, 'Arivvio Demo Flowers', 'Florals for weddings, memorials, and private events.', 'Florals', 'Los Angeles', 30, 'Los Angeles, CA', 34.0822, -118.2737, 'approved', 'https://example.com/demo-flowers', false),
    (seed_owner, 'Arivvio Demo Cake', 'Custom cakes and dessert tables.', 'Cake & Desserts', 'Los Angeles', 25, 'Los Angeles, CA', 34.0322, -118.2237, 'approved', 'https://example.com/demo-cake', false),
    (seed_owner, 'Arivvio Demo Security', 'Event security and guest flow support.', 'Security', 'Los Angeles', 50, 'Los Angeles, CA', 34.0222, -118.2137, 'approved', 'https://example.com/demo-security', false),
    (seed_owner, 'Arivvio Demo Live Music', 'Soloists and small live music groups.', 'Live Music', 'Los Angeles', 35, 'Los Angeles, CA', 34.0922, -118.2837, 'approved', 'https://example.com/demo-live-music', false),
    (seed_owner, 'Arivvio Demo Magic', 'Close-up and stage magic for parties.', 'Magic', 'Los Angeles', 35, 'Los Angeles, CA', 34.0122, -118.2037, 'approved', 'https://example.com/demo-magic', false),
    (seed_owner, 'Arivvio Demo Characters', 'Costumed character performers for family events.', 'Character Performers', 'Los Angeles', 30, 'Los Angeles, CA', 34.1022, -118.2937, 'approved', 'https://example.com/demo-characters', false);

  select id into venue_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Venue' limit 1;
  select id into dj_vendor from public.vendor_businesses where business_name = 'Arivvio Demo DJ' limit 1;
  select id into catering_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Catering' limit 1;
  select id into booth_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Photo Booth' limit 1;
  select id into rentals_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Rentals' limit 1;
  select id into flowers_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Flowers' limit 1;
  select id into cake_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Cake' limit 1;
  select id into security_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Security' limit 1;
  select id into music_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Live Music' limit 1;
  select id into magic_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Magic' limit 1;
  select id into character_vendor from public.vendor_businesses where business_name = 'Arivvio Demo Characters' limit 1;

  insert into public.vendor_services (
    vendor_id,
    service_name,
    category,
    description,
    event_types_supported,
    pricing_type,
    base_price,
    hourly_rate,
    minimum_hours,
    setup_fee,
    travel_fee,
    active
  )
  values
    (venue_vendor, 'Venue rental package', 'Venue', 'Demo venue rental for marketplace testing.', array['Birthday','Wedding','Corporate','Private Party','Fundraiser'], 'flat', 2500, null, null, 0, 0, true),
    (dj_vendor, 'DJ and MC package', 'DJ', 'Demo DJ service for parties and weddings.', array['Birthday','Wedding','Graduation','Private Party','Corporate'], 'hourly', null, 125, 3, 100, 50, true),
    (catering_vendor, 'Catering per guest', 'Catering', 'Demo catering menu priced per guest.', array['Birthday','Wedding','Corporate','Seminar','Private Party','Funeral'], 'per_guest', 65, null, null, 250, 100, true),
    (booth_vendor, 'Photo booth rental', 'Photo Booth', 'Demo photo booth package.', array['Birthday','Wedding','Graduation','Corporate','Private Party'], 'hourly', null, 150, 3, 100, 50, true),
    (rentals_vendor, 'Party rental bundle', 'Rentals', 'Demo rentals for tables, chairs, and lounge pieces.', array['Birthday','Wedding','Corporate','Private Party','Baby Shower'], 'flat', 1200, null, null, 100, 100, true),
    (flowers_vendor, 'Floral design package', 'Florals', 'Demo floral package for events.', array['Wedding','Funeral','Baby Shower','Fundraiser','Private Party'], 'flat', 900, null, null, 75, 50, true),
    (cake_vendor, 'Custom cake package', 'Cake & Desserts', 'Demo cake and dessert service.', array['Birthday','Wedding','Graduation','Baby Shower','Private Party'], 'flat', 450, null, null, 0, 25, true),
    (security_vendor, 'Event security team', 'Security', 'Demo event security service.', array['Corporate','Convention','Fundraiser','Private Party','Wedding'], 'hourly', null, 85, 4, 0, 100, true),
    (music_vendor, 'Live music performance', 'Live Music', 'Demo live music package.', array['Wedding','Corporate','Fundraiser','Private Party','Funeral'], 'hourly', null, 200, 2, 100, 75, true),
    (magic_vendor, 'Magic show', 'Magic', 'Demo magician performance.', array['Birthday','Private Party','Corporate','Baby Shower'], 'hourly', null, 175, 1, 0, 50, true),
    (character_vendor, 'Character performer', 'Character Performers', 'Demo costumed character performer.', array['Birthday','Baby Shower','Private Party'], 'hourly', null, 140, 2, 0, 50, true);

  insert into public.vendor_availability (
    vendor_id,
    date,
    start_time,
    end_time,
    status
  )
  select vendor_id, current_date + interval '14 days', '09:00', '22:00', 'available'
  from public.vendor_services
  where vendor_id in (
    venue_vendor,
    dj_vendor,
    catering_vendor,
    booth_vendor,
    rentals_vendor,
    flowers_vendor,
    cake_vendor,
    security_vendor,
    music_vendor,
    magic_vendor,
    character_vendor
  );

  insert into public.vendor_tags (vendor_id, tag)
  values
    (venue_vendor, 'venue'),
    (venue_vendor, 'wedding'),
    (venue_vendor, 'corporate'),
    (venue_vendor, 'formal'),
    (dj_vendor, 'dj'),
    (dj_vendor, 'birthday'),
    (dj_vendor, 'dance'),
    (dj_vendor, 'graduation'),
    (catering_vendor, 'catering'),
    (catering_vendor, 'corporate'),
    (catering_vendor, 'gala'),
    (catering_vendor, 'memorial'),
    (booth_vendor, 'photo-booth'),
    (booth_vendor, 'party'),
    (booth_vendor, 'graduation'),
    (rentals_vendor, 'rentals'),
    (rentals_vendor, 'backyard'),
    (rentals_vendor, 'baby-shower'),
    (flowers_vendor, 'florals'),
    (flowers_vendor, 'memorial'),
    (flowers_vendor, 'wedding'),
    (cake_vendor, 'cake'),
    (cake_vendor, 'dessert'),
    (cake_vendor, 'birthday'),
    (security_vendor, 'security'),
    (security_vendor, 'large-format'),
    (security_vendor, 'corporate'),
    (music_vendor, 'live-music'),
    (music_vendor, 'gala'),
    (music_vendor, 'wedding'),
    (magic_vendor, 'magic'),
    (magic_vendor, 'kids'),
    (magic_vendor, 'family-friendly'),
    (character_vendor, 'character'),
    (character_vendor, 'costume'),
    (character_vendor, 'family-friendly')
  on conflict (vendor_id, tag) do nothing;
end $$;
