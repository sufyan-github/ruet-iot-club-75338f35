import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock3, MapPin, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { apiRequest } from "@/lib/api";

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  eventType: string;
  category: string;
  eventStatus: string;
  featured: boolean;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationType: string;
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  onlineUrl: string | null;
  onlinePlatform: string | null;
  meetingInstructions: string | null;
  mapUrl: string | null;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  gallery: string[];
  posterUrl: string | null;
  videoUrl: string | null;
  registrationRequired: boolean;
  registrationMode: string;
  registrationUrl: string | null;
  registrationDeadline: string | null;
  maxParticipants: number;
  remainingCapacity: number | null;
  feeMinor: number;
  currency: string;
  paymentRequired: boolean;
  paymentMethods: string[];
  bkashNumber: string;
  registrationStatus: string;
  organizer: string;
  tags: string[];
  coOrganizers: string[];
  speakers: string[];
  trainers: string[];
  partners: string[];
  sponsors: string[];
  targetAudience: string | null;
  eligibility: string | null;
  certificateAvailable: boolean;
  certificateRequireRegistration: boolean;
  certificateRequirePayment: boolean;
  certificateRequireAttendance: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
function EventCard({ event }: { event: PublicEvent }) {
  const closed =
    ["CLOSED", "FULL"].includes(event.registrationStatus) ||
    new Date(event.endsAt) < new Date();
  return (
    <article className="group overflow-hidden rounded-2xl border border-border/60 bg-card/55 shadow-[0_24px_80px_-55px_hsl(var(--primary)/.75)] transition hover:-translate-y-1 hover:border-primary/30">
      {event.coverImageUrl ? (
        <img
          src={event.coverImageUrl}
          alt=""
          className="aspect-[16/8] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[16/8] items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10">
          <Calendar size={44} className="text-primary/70" />
        </div>
      )}
      <div className="p-5">
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
            {event.eventType}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
            {event.locationType}
          </span>
          {event.paymentRequired && (
            <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-300">
              {new Intl.NumberFormat("en-BD", {
                style: "currency",
                currency: event.currency,
              }).format(event.feeMinor / 100)}
            </span>
          )}
        </div>
        <h3 className="mt-4 text-xl font-semibold transition group-hover:text-primary">
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {event.shortDescription}
        </p>
        <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <Clock3 size={15} className="shrink-0 text-primary" />
            <span>{formatDate(event.startsAt)}</span>
          </div>
          <div className="flex gap-2">
            <MapPin size={15} className="shrink-0 text-primary" />
            <span>
              {event.locationType === "ONLINE"
                ? "Online"
                : event.venue || event.city || "Venue to be announced"}
            </span>
          </div>
          {event.maxParticipants > 0 && (
            <div className="flex gap-2">
              <Users size={15} className="shrink-0 text-primary" />
              <span>{event.maxParticipants} participant capacity</span>
            </div>
          )}
        </dl>
        <div className="mt-5 flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${closed ? "text-muted-foreground" : "text-emerald-300"}`}
          >
            {closed
              ? "Registration closed"
              : event.registrationStatus.replace(/_/g, " ")}
          </span>
          <Link
            to={`/events/${event.slug}`}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            View event
          </Link>
        </div>
      </div>
    </article>
  );
}
export default function Events() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  useEffect(() => {
    void apiRequest<PublicEvent[]>("/community/events")
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);
  const now = Date.now();
  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          (!query ||
            `${event.title} ${event.shortDescription} ${event.tags.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!type || event.eventType === type),
      ),
    [events, query, type],
  );
  const upcoming = filtered
    .filter((event) => new Date(event.endsAt).getTime() >= now)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const past = filtered
    .filter((event) => new Date(event.endsAt).getTime() < now)
    .sort(
      (a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
    );
  const types = Array.from(
    new Set(events.map((event) => event.eventType)),
  ).sort();
  return (
    <Layout>
      <SEO
        title="Events, Workshops & Competitions | RUET IoT Club"
        description="Discover upcoming and past RUET IoT Club workshops, hackathons, seminars, training programs, and competitions."
        path="/events"
      />
      <section className="py-20">
        <div className="container">
          <SectionHeading
            level={1}
            title="Events"
            subtitle="Learn, build, connect, and compete with the RUET IoT community"
          />
          <div className="mx-auto mb-12 grid max-w-4xl gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 md:grid-cols-[1fr_14rem]">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                aria-label="Search events"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events…"
                className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/50"
              />
            </label>
            <select
              aria-label="Event type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-xl border border-border bg-secondary/50 px-4 text-sm"
            >
              <option value="">All event types</option>
              {types.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="py-16 text-center text-muted-foreground">
              Loading events…
            </p>
          ) : (
            <div className="space-y-20">
              <section>
                <h2 className="text-2xl font-semibold">Upcoming Events</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nearest upcoming events appear first.
                </p>
                {upcoming.length ? (
                  <div className="mt-7 grid gap-6 lg:grid-cols-2">
                    {upcoming.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-7 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                    No upcoming events are scheduled right now. Follow our
                    announcements for the next program.
                  </div>
                )}
              </section>
              <section>
                <h2 className="text-2xl font-semibold">Past Events</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Recent completed events appear first.
                </p>
                {past.length ? (
                  <div className="mt-7 grid gap-6 lg:grid-cols-2">
                    {past.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-7 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                    Past event highlights will appear here after events
                    conclude.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
