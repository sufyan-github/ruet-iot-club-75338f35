import {
  deriveEventStatus,
  deriveRegistrationStatus,
  mediaReferenceFromUrl,
  type EventMediaReference,
  type EventStatus,
  type RegistrationStatus,
} from "./eventModel";

export interface PublicEvent {
  id: string; slug: string; title: string; shortDescription: string; fullDescription: string;
  eventType: string; category: string; eventStatus: EventStatus; eventStatusOverride?: "CANCELLED" | "POSTPONED" | null;
  featured: boolean; sortOrder?: number; startsAt: string; endsAt: string; timezone: string;
  locationType: "PHYSICAL" | "ONLINE" | "HYBRID"; venue: string | null; address: string | null; city: string | null; country: string;
  latitude: number | null; longitude: number | null; onlineUrl: string | null; onlinePlatform: string | null; meetingInstructions: string | null; mapUrl: string | null;
  heroImage: EventMediaReference | null; coverImageUrl: string | null; thumbnailUrl: string | null;
  galleryImages: EventMediaReference[]; gallery: string[]; posterUrl: string | null; videoUrl: string | null;
  registrationRequired: boolean; registrationMode: "INTERNAL" | "EXTERNAL" | "CLOSED"; registrationUrl: string | null;
  registrationOpensAt: string | null; registrationDeadline: string | null; maxParticipants: number; remainingCapacity: number | null; reservedCount?: number;
  registrationCapacityOverride?: boolean; feeMinor: number; currency: string; paymentRequired: boolean; paymentMethods: string[]; bkashNumber: string;
  registrationStatus: RegistrationStatus; registrationStatusOverride?: RegistrationStatus | null;
  organizer: string; tags: string[]; coOrganizers: string[]; speakers: string[]; trainers: string[]; partners: string[]; sponsors: string[];
  targetAudience: string | null; eligibility: string | null; certificateAvailable: boolean; certificateRequireRegistration: boolean;
  certificateRequirePayment: boolean; certificateRequireAttendance: boolean; contactEmail: string | null; contactPhone: string | null;
  seoTitle: string | null; metaDescription: string | null; ogImage: EventMediaReference | null; ogImageUrl: string | null;
  effectiveOgImageUrl?: string | null; canonicalUrl?: string | null; workflowStatus?: "DRAFT" | "PUBLISHED";
}

const text = (value: unknown, fallback = "") => String(value ?? fallback);
const list = (value: unknown) => Array.isArray(value) ? value.map(String) : [];

export function eventPreviewFromDraft(draft: Record<string, unknown>): PublicEvent {
  const startsAt = text(draft.startsAt, new Date().toISOString());
  const endsAt = text(draft.endsAt, new Date(Date.now() + 3600000).toISOString());
  const eventStatusOverride = (draft.eventStatusOverride || null) as "CANCELLED" | "POSTPONED" | null;
  const eventStatus = deriveEventStatus({ startsAt, endsAt, eventStatusOverride });
  const heroImage = (draft.heroImage as EventMediaReference | null) || mediaReferenceFromUrl(text(draft.coverImageUrl), text(draft.title));
  const galleryImages = Array.isArray(draft.galleryImages)
    ? draft.galleryImages as EventMediaReference[]
    : list(draft.gallery).map((url, index) => mediaReferenceFromUrl(url, `${text(draft.title,"Event")} gallery ${index + 1}`)).filter(Boolean) as EventMediaReference[];
  const ogImage = (draft.ogImage as EventMediaReference | null) || mediaReferenceFromUrl(text(draft.ogImageUrl), text(draft.title));
  const registrationStatus = deriveRegistrationStatus({
    startsAt, endsAt, eventStatus, eventStatusOverride,
    registrationRequired: Boolean(draft.registrationRequired),
    registrationMode: text(draft.registrationMode,"INTERNAL") as "INTERNAL" | "EXTERNAL" | "CLOSED",
    registrationOpensAt: text(draft.registrationOpensAt) || null,
    registrationDeadline: text(draft.registrationDeadline) || null,
    registrationStatusOverride: (draft.registrationStatusOverride || null) as RegistrationStatus | null,
    maxParticipants: Number(draft.maxParticipants || 0), reservedCount: Number(draft.reservedCount || 0),
    registrationCapacityOverride: Boolean(draft.registrationCapacityOverride),
  });
  return {
    id:text(draft.id,"preview"),slug:text(draft.slug,"event-preview"),title:text(draft.title,"Untitled event"),shortDescription:text(draft.shortDescription,"Add a short description to preview the event."),fullDescription:text(draft.fullDescription),
    eventType:text(draft.eventType,"Event"),category:text(draft.category,"General"),eventStatus,eventStatusOverride,featured:Boolean(draft.featured),sortOrder:Number(draft.sortOrder||0),startsAt,endsAt,timezone:text(draft.timezone,"Asia/Dhaka"),
    locationType:text(draft.locationType,"PHYSICAL") as PublicEvent["locationType"],venue:text(draft.venue)||null,address:text(draft.address)||null,city:text(draft.city)||null,country:text(draft.country,"Bangladesh"),latitude:draft.latitude===null?null:Number(draft.latitude||0)||null,longitude:draft.longitude===null?null:Number(draft.longitude||0)||null,
    onlineUrl:text(draft.onlineUrl)||null,onlinePlatform:text(draft.onlinePlatform)||null,meetingInstructions:text(draft.meetingInstructions)||null,mapUrl:text(draft.mapUrl)||null,
    heroImage,coverImageUrl:heroImage?.url||text(draft.coverImageUrl)||null,thumbnailUrl:text(draft.thumbnailUrl)||null,galleryImages,gallery:galleryImages.map((image)=>image.url),posterUrl:text(draft.posterUrl)||null,videoUrl:text(draft.videoUrl)||null,
    registrationRequired:Boolean(draft.registrationRequired),registrationMode:text(draft.registrationMode,"INTERNAL") as PublicEvent["registrationMode"],registrationUrl:text(draft.registrationUrl)||null,registrationOpensAt:text(draft.registrationOpensAt)||null,registrationDeadline:text(draft.registrationDeadline)||null,
    maxParticipants:Number(draft.maxParticipants||0),remainingCapacity:draft.remainingCapacity===null?null:Number(draft.remainingCapacity??draft.maxParticipants??0)||null,reservedCount:Number(draft.reservedCount||0),registrationCapacityOverride:Boolean(draft.registrationCapacityOverride),
    feeMinor:Number(draft.feeMinor||0),currency:text(draft.currency,"BDT"),paymentRequired:Boolean(draft.paymentRequired),paymentMethods:list(draft.paymentMethods),bkashNumber:text(draft.bkashNumber,"01580352238"),registrationStatus,registrationStatusOverride:(draft.registrationStatusOverride||null) as RegistrationStatus|null,
    organizer:text(draft.organizer,"RUET IoT Club"),tags:list(draft.tags),coOrganizers:list(draft.coOrganizers),speakers:list(draft.speakers),trainers:list(draft.trainers),partners:list(draft.partners),sponsors:list(draft.sponsors),targetAudience:text(draft.targetAudience)||null,eligibility:text(draft.eligibility)||null,
    certificateAvailable:Boolean(draft.certificateAvailable),certificateRequireRegistration:Boolean(draft.certificateRequireRegistration),certificateRequirePayment:Boolean(draft.certificateRequirePayment),certificateRequireAttendance:Boolean(draft.certificateRequireAttendance),contactEmail:text(draft.contactEmail)||null,contactPhone:text(draft.contactPhone)||null,
    seoTitle:text(draft.seoTitle)||null,metaDescription:text(draft.metaDescription)||null,ogImage,ogImageUrl:ogImage?.url||heroImage?.url||text(draft.ogImageUrl)||null,effectiveOgImageUrl:ogImage?.url||heroImage?.url||null,canonicalUrl:text(draft.canonicalUrl)||null,workflowStatus:text(draft.workflowStatus,"DRAFT") as PublicEvent["workflowStatus"],
  };
}
