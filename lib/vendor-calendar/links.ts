export function vendorCalendarLink(business: string, options: { event?: string; client?: string } = {}) {
  const query = new URLSearchParams({ business });
  if (options.event) query.set('event', options.event);
  if (options.client) query.set('client', options.client);
  return '/vendor/calendar?' + query;
}

export function vendorClientLink(business: string, client: string) {
  return '/vendor/clients?' + new URLSearchParams({ business, client });
}

export function vendorBookingLink(business: string, booking?: string) {
  const query = new URLSearchParams({ business });
  if (booking) query.set('booking', booking);
  return '/vendor/bookings?' + query;
}

export function vendorRequestLink(business: string, request?: string) {
  const query = new URLSearchParams({ business });
  if (request) query.set('request', request);
  return '/vendor/requests?' + query;
}
