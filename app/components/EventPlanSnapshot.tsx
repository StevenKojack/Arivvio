import { EventAtmosphere } from "./EventAtmosphere";
import { eventAtmospheres, type Atmosphere } from "@/lib/event-intelligence/atmosphere";
export function EventPlanSnapshot({ name, date, guests, budget, services, atmosphere = eventAtmospheres[0], sample = false }: { name: string; date: string; guests: string; budget: string; services: string[]; atmosphere?: Atmosphere; sample?: boolean }) {
  return <div className="event-plan-snapshot">
    <div className="snapshot-photo"><EventAtmosphere atmosphere={atmosphere} sizes="(max-width: 640px) 100vw, 420px" /><span>{sample ? "Example plan · Event Hub" : "Your occasion"}</span></div>
    <div className="snapshot-body"><p className="eyebrow">{date}</p><h3>{name}</h3><dl><div><dt>Guests</dt><dd>{guests}</dd></div><div><dt>Planning budget</dt><dd>{budget}</dd></div></dl><p className="snapshot-services">{services.length ? services.join(" · ") : "Your event team starts here"}</p><p className="text-xs ui-muted">{sample ? "A sample of the same summary used in your Event Hub." : "Your planning details. No bookings confirmed."}</p></div>
  </div>;
}
