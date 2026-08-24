import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EventPresentation from "@/components/EventPresentation";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { apiRequest } from "@/lib/api";
import type { PublicEvent } from "@/lib/events";

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (slug) void apiRequest<PublicEvent>(`/community/events/${encodeURIComponent(slug)}`)
      .then(setEvent).catch(() => setEvent(null)).finally(() => setLoading(false));
  }, [slug]);
  if (loading) return <Layout><div className="container py-28 text-center text-muted-foreground">Loading event…</div></Layout>;
  if (!event) return <Layout><div className="container py-28 text-center"><h1 className="text-3xl font-bold">Event unavailable</h1><Link to="/events" className="mt-5 inline-block text-primary">Return to Events</Link></div></Layout>;
  const register = () => event.registrationMode === "EXTERNAL" && event.registrationUrl
    ? window.open(event.registrationUrl, "_blank", "noopener,noreferrer")
    : navigate("/events/register", { state: { event: { id: event.id, title: event.title, description: event.shortDescription, date: event.startsAt, venue: event.venue, image_url: event.coverImageUrl, type: event.paymentRequired ? "PAID" : "FREE", is_paid: event.paymentRequired, registration_fee: event.feeMinor / 100, currency: event.currency, max_participants: event.maxParticipants, payment_number: event.bkashNumber, payment_methods: event.paymentMethods } } });
  return <Layout>
    <SEO title={event.seoTitle || `${event.title} | RUET IoT Club`} description={event.metaDescription || event.shortDescription} path={`/events/${event.slug}`} image={event.effectiveOgImageUrl || event.ogImageUrl || event.coverImageUrl || undefined} />
    <EventPresentation event={event} onRegister={register} />
  </Layout>;
}
