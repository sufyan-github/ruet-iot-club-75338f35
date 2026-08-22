import { useEffect, useState } from "react";
import { CalendarDays, Clock3, ExternalLink, MapPin, Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { apiRequest } from "@/lib/api";
import type { PublicEvent } from "./Events";

const date = (value: string) => new Intl.DateTimeFormat("en-BD", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(value));

export default function EventDetail() {
  const { slug } = useParams(), navigate = useNavigate();
  const [event, setEvent] = useState<PublicEvent | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => { if (slug) void apiRequest<PublicEvent>(`/community/events/${encodeURIComponent(slug)}`).then(setEvent).catch(() => setEvent(null)).finally(() => setLoading(false)); }, [slug]);
  if (loading) return <Layout><div className="container py-28 text-center text-muted-foreground">Loading event…</div></Layout>;
  if (!event) return <Layout><div className="container py-28 text-center"><h1 className="text-3xl font-bold">Event unavailable</h1><Link to="/events" className="mt-5 inline-block text-primary">Return to Events</Link></div></Layout>;
  const closed = ["CLOSED", "FULL"].includes(event.registrationStatus) || Boolean(event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) || new Date(event.endsAt) < new Date();
  const address = [event.venue, event.address, event.city, event.country].filter(Boolean).join(", ");
  const register = () => event.registrationMode === "EXTERNAL" && event.registrationUrl
    ? window.open(event.registrationUrl, "_blank", "noopener,noreferrer")
    : navigate("/events/register", { state: { event: { id: event.id, title: event.title, description: event.shortDescription, date: event.startsAt, venue: event.venue, image_url: event.coverImageUrl, type: event.paymentRequired ? "PAID" : "FREE", is_paid: event.paymentRequired, registration_fee: event.feeMinor / 100, currency: event.currency, max_participants: event.maxParticipants, payment_number: event.bkashNumber } } });
  return <Layout>
    <SEO title={event.seoTitle || `${event.title} | RUET IoT Club`} description={event.metaDescription || event.shortDescription} path={`/events/${event.slug}`} image={event.ogImageUrl || event.coverImageUrl || undefined} />
    <article>
      <header className="border-b border-border/50 py-16"><div className="container max-w-5xl"><div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide"><span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{event.eventType}</span><span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{event.category}</span><span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{event.eventStatus}</span></div><h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">{event.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{event.shortDescription}</p></div></header>
      {event.coverImageUrl && <div className="container max-w-6xl py-8"><img src={event.coverImageUrl} alt={event.title} className="max-h-[560px] w-full rounded-3xl border border-border/60 object-cover" /></div>}
      <div className="container grid max-w-6xl gap-10 py-12 lg:grid-cols-[1fr_22rem]">
        <main className="space-y-10">
          <section><h2 className="text-2xl font-semibold">About this event</h2><div className="prose prose-invert mt-4 max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: event.fullDescription }} /></section>
          {event.gallery?.length > 0 && <section><h2 className="text-xl font-semibold">Gallery</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{event.gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${event.title} gallery ${index + 1}`} className="aspect-video w-full rounded-2xl border border-border object-cover" />)}</div></section>}
          {[event.speakers?.length && ["Speakers", event.speakers], event.trainers?.length && ["Trainers", event.trainers], event.partners?.length && ["Partners", event.partners], event.sponsors?.length && ["Sponsors", event.sponsors]].filter(Boolean).map((entry) => { const [title, items] = entry as [string, string[]]; return <ListSection key={title} title={title} items={items} />; })}
          {event.targetAudience && <TextSection title="Who should attend" value={event.targetAudience} />}
          {event.eligibility && <TextSection title="Eligibility" value={event.eligibility} />}
          {["PHYSICAL", "HYBRID"].includes(event.locationType) && <section><h2 className="text-xl font-semibold">Location</h2><GoogleMapEmbed address={address} embedUrl={event.mapUrl} className="mt-4" heightClassName="h-72" /></section>}
          {event.certificateAvailable && <section className="rounded-2xl border border-primary/20 bg-primary/[.05] p-5"><h2 className="text-xl font-semibold">Event certificate</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Eligible participants can request a verified RUET IoT Club certificate from their dashboard after meeting the configured registration{event.certificateRequirePayment ? ", payment" : ""}{event.certificateRequireAttendance ? ", and attendance" : ""} requirements.</p></section>}
        </main>
        <aside><div className="sticky top-28 rounded-2xl border border-primary/20 bg-card/70 p-6"><h2 className="font-semibold">Event information</h2><dl className="mt-5 space-y-4 text-sm"><Info icon={<CalendarDays />} label="Starts" value={date(event.startsAt)} /><Info icon={<Clock3 />} label="Ends" value={date(event.endsAt)} /><Info icon={<MapPin />} label="Location" value={event.locationType === "ONLINE" ? event.onlinePlatform || "Online" : event.venue || event.city || "To be announced"} />{event.maxParticipants > 0 && <Info icon={<Users />} label="Capacity" value={event.remainingCapacity === null ? `${event.maxParticipants} participants` : `${event.remainingCapacity} of ${event.maxParticipants} spaces remaining`} />}</dl>
          {event.paymentRequired && <div className="mt-5 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-100"><p className="font-semibold">{new Intl.NumberFormat("en-BD", { style: "currency", currency: event.currency }).format(event.feeMinor / 100)}</p><p className="mt-1">Send Money to bKash <strong>{event.bkashNumber}</strong>, then submit the transaction ID and payer number.</p></div>}
          {event.registrationRequired ? <button disabled={closed} onClick={register} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{closed ? event.registrationStatus === "FULL" ? "Event full" : "Registration closed" : "Register now"}{event.registrationMode === "EXTERNAL" && <ExternalLink size={16} />}</button> : <p className="mt-5 text-sm text-muted-foreground">Registration is not required.</p>}
          {event.contactEmail && <a className="mt-4 block text-center text-sm text-primary hover:underline" href={`mailto:${event.contactEmail}`}>Contact organizer</a>}
        </div></aside>
      </div>
    </article>
  </Layout>;
}
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex gap-3"><span className="mt-0.5 text-primary [&>svg]:size-4">{icon}</span><div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5">{value}</dd></div></div>; }
function ListSection({ title, items }: { title: string; items: string[] }) { return <section><h2 className="text-xl font-semibold">{title}</h2><div className="mt-4 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full border border-primary/15 bg-primary/[.06] px-3 py-1.5 text-sm">{item}</span>)}</div></section>; }
function TextSection({ title, value }: { title: string; value: string }) { return <section><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{value}</p></section>; }
