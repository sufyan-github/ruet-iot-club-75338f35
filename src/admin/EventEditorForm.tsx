import { createContext, useContext, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import {
  deriveEventStatus,
  deriveRegistrationStatus,
  fromEventDateTimeLocal,
  mediaReferenceFromUrl,
  toEventDateTimeLocal,
  type EventMediaReference,
} from "@/lib/eventModel";
import {
  AdminCard,
  StatusBadge,
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";
import { HeroImageField } from "./HeroImageField";
import RichTextEditor from "./RichTextEditor";

type EventDraft = Record<string, unknown>;
type EventFieldErrors = Record<string, string[]>;
const EventValidationContext = createContext<EventFieldErrors>({});
const fieldKeysByLabel: Record<string, string> = {
  "Event title": "title",
  "Event type": "eventType",
  Category: "category",
  "Short description": "shortDescription",
  Starts: "startsAt",
  Ends: "endsAt",
  Timezone: "timezone",
  "Location type": "locationType",
  Venue: "venue",
  Address: "address",
  City: "city",
  Country: "country",
  "Online platform": "onlinePlatform",
  "Meeting URL": "onlineUrl",
  "Google Maps embed URL": "mapUrl",
  "Meeting instructions": "meetingInstructions",
  "Registration mode": "registrationMode",
  "External registration URL": "registrationUrl",
  "Registration opens": "registrationOpensAt",
  "Registration deadline": "registrationDeadline",
  "Maximum participants (0 = unlimited)": "maxParticipants",
  "Registration fee (paisa; ৳500 = 50000)": "feeMinor",
  Currency: "currency",
  "Payment receiver number": "bkashNumber",
  "Operational override": "eventStatusOverride",
  Slug: "slug",
  "Display order": "sortOrder",
  Organizer: "organizer",
  "Target audience": "targetAudience",
  Eligibility: "eligibility",
  "Contact email": "contactEmail",
  "Contact phone": "contactPhone",
  "SEO title": "seoTitle",
  "Meta description": "metaDescription",
  "Canonical URL": "canonicalUrl",
  "Publication status": "workflowStatus",
  "Minimum attendance percent": "certificateMinAttendancePercent",
};
const advancedFieldKeys = new Set([
  "slug",
  "eventStatusOverride",
  "timezone",
  "sortOrder",
  "country",
  "mapUrl",
  "meetingInstructions",
  "galleryImages",
  "gallery",
  "videoUrl",
  "ogImage",
  "ogImageUrl",
  "registrationOpensAt",
  "registrationStatusOverride",
  "registrationCapacityOverride",
  "currency",
  "bkashNumber",
  "organizer",
  "coOrganizers",
  "partners",
  "sponsors",
  "speakers",
  "trainers",
  "tags",
  "targetAudience",
  "eligibility",
  "certificateAvailable",
  "certificateRequireRegistration",
  "certificateRequirePayment",
  "certificateRequireAttendance",
  "certificateMinAttendancePercent",
  "contactEmail",
  "contactPhone",
  "seoTitle",
  "metaDescription",
  "canonicalUrl",
]);

function humanFieldName(key: string) {
  const label = Object.entries(fieldKeysByLabel).find(
    ([, value]) => value === key,
  )?.[0];
  return label || key.replace(/([a-z])([A-Z])/gu, "$1 $2").replace(/\./gu, " ");
}

function useControlError(label: string) {
  const errors = useContext(EventValidationContext);
  const key = fieldKeysByLabel[label];
  return key ? errors[key]?.[0] : undefined;
}
const eventTypes = [
  "Workshop",
  "Seminar",
  "Hackathon",
  "Competition",
  "Training",
  "Conference",
  "Meetup",
  "Webinar",
  "Exhibition",
  "Other",
];
const timezones = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export default function EventEditorForm({
  value,
  csrfToken,
  fieldErrors = {},
  onChange,
}: {
  value: EventDraft;
  csrfToken?: string;
  fieldErrors?: EventFieldErrors;
  onChange: (key: string, value: unknown) => void;
}) {
  const timezone = String(value.timezone || "Asia/Dhaka");
  const eventStatus = useMemo(
    () =>
      deriveEventStatus({
        startsAt: String(value.startsAt || ""),
        endsAt: String(value.endsAt || ""),
        eventStatusOverride: (value.eventStatusOverride || null) as
          | "CANCELLED"
          | "POSTPONED"
          | null,
      }),
    [value.startsAt, value.endsAt, value.eventStatusOverride],
  );
  const registrationStatus = useMemo(
    () =>
      deriveRegistrationStatus({
        startsAt: String(value.startsAt || ""),
        endsAt: String(value.endsAt || ""),
        eventStatus,
        eventStatusOverride: (value.eventStatusOverride || null) as
          | "CANCELLED"
          | "POSTPONED"
          | null,
        registrationRequired: Boolean(value.registrationRequired),
        registrationMode: String(value.registrationMode || "INTERNAL") as
          | "INTERNAL"
          | "EXTERNAL"
          | "CLOSED",
        registrationOpensAt: String(value.registrationOpensAt || "") || null,
        registrationDeadline: String(value.registrationDeadline || "") || null,
        registrationStatusOverride: (value.registrationStatusOverride ||
          null) as "UPCOMING" | "OPEN" | "CLOSED" | "FULL" | null,
        maxParticipants: Number(value.maxParticipants || 0),
        reservedCount: Number(value.reservedCount || 0),
        registrationCapacityOverride: Boolean(
          value.registrationCapacityOverride,
        ),
      }),
    [eventStatus, value],
  );
  const updateDate = (key: string, local: string) =>
    onChange(key, local ? fromEventDateTimeLocal(local, timezone) : "");
  const hero =
    (value.heroImage as EventMediaReference | null) ||
    mediaReferenceFromUrl(
      String(value.coverImageUrl || ""),
      String(value.title || ""),
    );
  const gallery = Array.isArray(value.galleryImages)
    ? (value.galleryImages as EventMediaReference[])
    : [];
  const og =
    (value.ogImage as EventMediaReference | null) ||
    mediaReferenceFromUrl(
      String(value.ogImageUrl || ""),
      String(value.title || ""),
    );
  const locationType = String(value.locationType || "PHYSICAL");
  const registrationRequired = Boolean(value.registrationRequired);
  const paymentRequired =
    registrationRequired && Boolean(value.paymentRequired);
  const certificateAvailable = Boolean(value.certificateAvailable);
  const validationEntries = Object.entries(fieldErrors).flatMap(
    ([field, messages]) => messages.map((message) => ({ field, message })),
  );
  const hasAdvancedErrors = Object.keys(fieldErrors).some((field) =>
    advancedFieldKeys.has(field.split(".")[0]),
  );
  const fullDescriptionError = fieldErrors.fullDescription?.[0];

  return (
    <EventValidationContext.Provider value={fieldErrors}>
      <div className="space-y-6">
        {validationEntries.length > 0 && (
          <section
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/[0.08] p-5"
          >
            <h3 className="font-semibold text-red-200">
              Please review {validationEntries.length} field
              {validationEntries.length === 1 ? "" : "s"}
            </h3>
            <ul className="mt-3 space-y-1 text-sm text-red-100/90">
              {validationEntries.map(({ field, message }, index) => (
                <li key={`${field}-${index}`}>
                  <strong>{humanFieldName(field)}:</strong> {message}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Group
          title="Essential details"
          description="Add only the public information this event needs. Registration, media extras, payments, certificates, SEO, and other features are optional."
        >
          <TextField
            label="Event title"
            value={value.title}
            required
            wide
            onChange={(item) => onChange("title", item)}
          />
          <SelectField
            label="Event type"
            value={value.eventType}
            options={eventTypes}
            onChange={(item) => onChange("eventType", item)}
          />
          <TextField
            label="Category"
            value={value.category}
            required
            onChange={(item) => onChange("category", item)}
          />
          <TextArea
            label="Short description"
            value={value.shortDescription}
            required
            wide
            maxLength={500}
            onChange={(item) => onChange("shortDescription", item)}
          />
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">
              Full description <span className="text-primary">*</span>
            </p>
            <RichTextEditor
              value={String(value.fullDescription || "")}
              onChange={(item) => onChange("fullDescription", item)}
              invalid={Boolean(fullDescriptionError)}
              describedBy={
                fullDescriptionError
                  ? "event-full-description-error"
                  : undefined
              }
            />
            {fullDescriptionError && (
              <p
                id="event-full-description-error"
                className="mt-1 text-xs text-red-300"
              >
                {fullDescriptionError}
              </p>
            )}
          </div>
        </Group>

        <Group
          title="Schedule and location"
          description={`Times use ${timezone}. Only fields required by the selected event format are shown.`}
        >
          <DateField
            label="Starts"
            value={String(value.startsAt || "")}
            timezone={timezone}
            onChange={(item) => updateDate("startsAt", item)}
          />
          <DateField
            label="Ends"
            value={String(value.endsAt || "")}
            timezone={timezone}
            onChange={(item) => updateDate("endsAt", item)}
          />
          <SelectField
            label="Location type"
            value={locationType}
            options={["PHYSICAL", "ONLINE", "HYBRID"]}
            onChange={(item) => onChange("locationType", item)}
          />
          {locationType !== "ONLINE" && (
            <>
              <TextField
                label="Venue"
                value={value.venue}
                required={String(value.workflowStatus) === "PUBLISHED"}
                onChange={(item) => onChange("venue", item)}
              />
              <TextField
                label="Address"
                value={value.address}
                required={String(value.workflowStatus) === "PUBLISHED"}
                wide
                onChange={(item) => onChange("address", item)}
              />
              <TextField
                label="City"
                value={value.city}
                required={String(value.workflowStatus) === "PUBLISHED"}
                onChange={(item) => onChange("city", item)}
              />
            </>
          )}
          {locationType !== "PHYSICAL" && (
            <>
              <TextField
                label="Online platform"
                value={value.onlinePlatform}
                required={String(value.workflowStatus) === "PUBLISHED"}
                onChange={(item) => onChange("onlinePlatform", item)}
              />
              <TextField
                label="Meeting URL"
                type="url"
                value={value.onlineUrl}
                required={String(value.workflowStatus) === "PUBLISHED"}
                onChange={(item) => onChange("onlineUrl", item)}
              />
            </>
          )}
        </Group>

        <Group
          title="Event media"
          description="Choose one primary image. It is reused for event cards and social sharing unless an advanced override is supplied."
        >
          <div className="sm:col-span-2">
            <HeroImageField
              value={hero}
              altText={hero?.altText || ""}
              title="Hero Image"
              purpose="hero"
              helpText="Optional. Events without an image use the standard event placeholder."
              csrfToken={csrfToken}
              onChange={(media) => {
                onChange("heroImage", media);
                onChange("coverImageUrl", media?.url || "");
              }}
              onAltTextChange={(altText) =>
                onChange("heroImage", hero ? { ...hero, altText } : null)
              }
              onUploadingChange={() => undefined}
            />
          </div>
        </Group>

        <Group
          title="Registration and payment"
          description="Enable only what this event needs. Registration status and capacity are calculated automatically."
        >
          <CheckField
            label="Registration required"
            checked={registrationRequired}
            onChange={(item) => {
              onChange("registrationRequired", item);
              if (
                item &&
                String(value.registrationMode || "CLOSED") === "CLOSED"
              )
                onChange("registrationMode", "INTERNAL");
              if (!item) {
                onChange("registrationMode", "CLOSED");
                onChange("paymentRequired", false);
                onChange("feeMinor", 0);
              }
            }}
          />
          {registrationRequired && (
            <>
              <SelectField
                label="Registration mode"
                value={value.registrationMode}
                options={["INTERNAL", "EXTERNAL", "CLOSED"]}
                onChange={(item) => onChange("registrationMode", item)}
              />
              <div className="flex items-end pb-1">
                <div className="rounded-xl border border-[hsl(var(--admin-border))] p-3">
                  <p className="text-xs text-muted-foreground">
                    Effective registration
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={registrationStatus} />
                  </div>
                </div>
              </div>
              {String(value.registrationMode) === "EXTERNAL" && (
                <TextField
                  label="External registration URL"
                  type="url"
                  required
                  value={value.registrationUrl}
                  wide
                  onChange={(item) => onChange("registrationUrl", item)}
                />
              )}
              <DateField
                label="Registration deadline"
                optional
                value={String(value.registrationDeadline || "")}
                timezone={timezone}
                onChange={(item) => updateDate("registrationDeadline", item)}
              />
              <NumberField
                label="Maximum participants (0 = unlimited)"
                value={value.maxParticipants}
                min={0}
                onChange={(item) => onChange("maxParticipants", item)}
              />
              <CheckField
                label="Payment required"
                checked={paymentRequired}
                onChange={(item) => {
                  onChange("paymentRequired", item);
                  if (!item) onChange("feeMinor", 0);
                }}
              />
              {paymentRequired && (
                <>
                  <NumberField
                    label="Registration fee (paisa; ৳500 = 50000)"
                    value={value.feeMinor}
                    min={1}
                    onChange={(item) => onChange("feeMinor", item)}
                  />
                  <PaymentMethods
                    value={
                      Array.isArray(value.paymentMethods)
                        ? value.paymentMethods.map(String)
                        : []
                    }
                    onChange={(item) => onChange("paymentMethods", item)}
                  />
                </>
              )}
            </>
          )}
        </Group>

        <Group
          title="Publishing"
          description="Save as draft while preparing the event, then publish when all required fields are complete."
        >
          <CheckField
            label="Featured event"
            checked={Boolean(value.featured)}
            onChange={(item) => onChange("featured", item)}
          />
          <SelectField
            label="Publication status"
            value={value.workflowStatus}
            options={["DRAFT", "PUBLISHED"]}
            onChange={(item) => onChange("workflowStatus", item)}
          />
          {String(value.workflowStatus) === "PUBLISHED" && (
            <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
              Optional features may remain disabled. Only core event details and
              applicable location fields are checked before publishing.
            </div>
          )}
        </Group>

        <details
          open={hasAdvancedErrors || undefined}
          className="group overflow-hidden rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold outline-none transition hover:bg-white/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
            <span>
              Advanced options
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                Optional media, SEO, certificates, organizers, and operational
                controls.
              </span>
            </span>
            <span
              aria-hidden="true"
              className="text-xl text-primary transition group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="space-y-6 border-t border-[hsl(var(--admin-border))] p-5">
            <Group
              title="URL, status, and display"
              description="Use these only when the generated defaults need to be changed."
            >
              <TextField
                label="Slug"
                value={value.slug}
                required
                help="Changing a published slug changes its public URL."
                onChange={(item) => onChange("slug", item)}
              />
              <SelectField
                label="Operational override"
                value={value.eventStatusOverride || "AUTO"}
                options={["AUTO", "CANCELLED", "POSTPONED"]}
                help="Scheduled, ongoing, and completed are calculated automatically."
                onChange={(item) =>
                  onChange("eventStatusOverride", item === "AUTO" ? null : item)
                }
              />
              <SelectField
                label="Timezone"
                value={timezone}
                options={timezones}
                onChange={(item) => onChange("timezone", item)}
              />
              <NumberField
                label="Display order"
                value={value.sortOrder}
                min={-10000}
                onChange={(item) => onChange("sortOrder", item)}
              />
              <div className="flex items-end pb-1">
                <div className="rounded-xl border border-[hsl(var(--admin-border))] p-3">
                  <p className="text-xs text-muted-foreground">
                    Effective status
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={eventStatus} />
                  </div>
                </div>
              </div>
            </Group>

            <Group title="Additional location details">
              <TextField
                label="Country"
                value={value.country}
                onChange={(item) => onChange("country", item)}
              />
              <TextField
                label="Google Maps embed URL"
                type="url"
                value={value.mapUrl}
                wide
                onChange={(item) => onChange("mapUrl", item)}
              />
              {locationType !== "PHYSICAL" && (
                <TextArea
                  label="Meeting instructions"
                  value={value.meetingInstructions}
                  wide
                  onChange={(item) => onChange("meetingInstructions", item)}
                />
              )}
            </Group>

            <Group
              title="Gallery and social media"
              description="If a Hero Image exists it is reused by default. Add these only when the event needs extra assets."
            >
              <GalleryField
                images={gallery}
                title={String(value.title || "Event")}
                csrfToken={csrfToken}
                onChange={(images) => {
                  onChange("galleryImages", images);
                  onChange(
                    "gallery",
                    images.map((image) => image.url),
                  );
                }}
              />
              <TextField
                label="Video URL"
                type="url"
                value={value.videoUrl}
                wide
                onChange={(item) => onChange("videoUrl", item)}
              />
              <details className="sm:col-span-2 rounded-xl border border-[hsl(var(--admin-border))] p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {og
                    ? "Change custom social image"
                    : "Add custom social image"}
                </summary>
                <div className="mt-4">
                  <HeroImageField
                    value={og}
                    altText={og?.altText || ""}
                    title="Open Graph Image"
                    purpose="og"
                    helpText="Optional. If empty, Hero Image is used automatically."
                    csrfToken={csrfToken}
                    onChange={(media) => {
                      onChange("ogImage", media);
                      onChange("ogImageUrl", media?.url || "");
                    }}
                    onAltTextChange={(altText) =>
                      onChange("ogImage", og ? { ...og, altText } : null)
                    }
                    onUploadingChange={() => undefined}
                  />
                </div>
              </details>
            </Group>

            {registrationRequired && (
              <Group title="Advanced registration controls">
                <DateField
                  label="Registration opens"
                  optional
                  value={String(value.registrationOpensAt || "")}
                  timezone={timezone}
                  onChange={(item) => updateDate("registrationOpensAt", item)}
                />
                <SelectField
                  label="Registration override"
                  value={value.registrationStatusOverride || "AUTO"}
                  options={["AUTO", "UPCOMING", "OPEN", "CLOSED", "FULL"]}
                  onChange={(item) =>
                    onChange(
                      "registrationStatusOverride",
                      item === "AUTO" ? null : item,
                    )
                  }
                />
                <CheckField
                  label="Override automatic capacity closing"
                  checked={Boolean(value.registrationCapacityOverride)}
                  onChange={(item) =>
                    onChange("registrationCapacityOverride", item)
                  }
                />
                {paymentRequired && (
                  <>
                    <TextField
                      label="Currency"
                      value={value.currency}
                      onChange={(item) =>
                        onChange("currency", item.toUpperCase())
                      }
                    />
                    <TextField
                      label="Payment receiver number"
                      value={value.bkashNumber}
                      onChange={(item) => onChange("bkashNumber", item)}
                    />
                  </>
                )}
              </Group>
            )}

            <Group title="Organizers and audience">
              <TextField
                label="Organizer"
                value={value.organizer}
                required
                onChange={(item) => onChange("organizer", item)}
              />
              {[
                ["coOrganizers", "Co-organizers"],
                ["partners", "Partners"],
                ["sponsors", "Sponsors"],
                ["speakers", "Speakers"],
                ["trainers", "Trainers"],
                ["tags", "Tags"],
              ].map(([key, label]) => (
                <ListField
                  key={key}
                  label={label}
                  value={value[key]}
                  onChange={(item) => onChange(key, item)}
                />
              ))}
              <TextArea
                label="Target audience"
                value={value.targetAudience}
                wide
                onChange={(item) => onChange("targetAudience", item)}
              />
              <TextArea
                label="Eligibility"
                value={value.eligibility}
                wide
                onChange={(item) => onChange("eligibility", item)}
              />
            </Group>

            <Group title="Certificate">
              <CheckField
                label="Certificate available"
                checked={certificateAvailable}
                onChange={(item) => onChange("certificateAvailable", item)}
              />
              {certificateAvailable && (
                <>
                  <CheckField
                    label="Require approved registration"
                    checked={Boolean(value.certificateRequireRegistration)}
                    onChange={(item) =>
                      onChange("certificateRequireRegistration", item)
                    }
                  />
                  {paymentRequired && (
                    <CheckField
                      label="Require verified payment"
                      checked={Boolean(value.certificateRequirePayment)}
                      onChange={(item) =>
                        onChange("certificateRequirePayment", item)
                      }
                    />
                  )}
                  <CheckField
                    label="Require attendance"
                    checked={Boolean(value.certificateRequireAttendance)}
                    onChange={(item) =>
                      onChange("certificateRequireAttendance", item)
                    }
                  />
                  <NumberField
                    label="Minimum attendance percent"
                    value={value.certificateMinAttendancePercent}
                    min={0}
                    max={100}
                    onChange={(item) =>
                      onChange("certificateMinAttendancePercent", item)
                    }
                  />
                </>
              )}
            </Group>

            <Group title="SEO and contact">
              <TextField
                label="Contact email"
                type="email"
                value={value.contactEmail}
                onChange={(item) => onChange("contactEmail", item)}
              />
              <TextField
                label="Contact phone"
                value={value.contactPhone}
                onChange={(item) => onChange("contactPhone", item)}
              />
              <TextField
                label="SEO title"
                value={value.seoTitle}
                wide
                onChange={(item) => onChange("seoTitle", item)}
              />
              <TextArea
                label="Meta description"
                value={value.metaDescription}
                wide
                maxLength={500}
                onChange={(item) => onChange("metaDescription", item)}
              />
              <TextField
                label="Canonical URL"
                type="url"
                value={value.canonicalUrl}
                wide
                onChange={(item) => onChange("canonicalUrl", item)}
              />
            </Group>
          </div>
        </details>
      </div>
    </EventValidationContext.Provider>
  );
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="p-5">
      <h3 className="font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </AdminCard>
  );
}
function FieldError({ message }: { message?: string }) {
  return message ? (
    <span role="alert" className="mt-1 block text-xs font-normal text-red-300">
      {message}
    </span>
  ) : null;
}
function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  wide = false,
  help,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  wide?: boolean;
  help?: string;
}) {
  const error = useControlError(label);
  return (
    <label className={`${wide ? "sm:col-span-2" : ""} text-sm font-medium`}>
      {label}
      {required && <span className="text-primary"> *</span>}
      <input
        type={type}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${adminInput} mt-2 ${error ? "border-red-400/70 focus:border-red-400 focus:ring-red-400/20" : ""}`}
      />
      {help && (
        <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
          {help}
        </span>
      )}
      <FieldError message={error} />
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
  required = false,
  wide = false,
  maxLength,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  required?: boolean;
  wide?: boolean;
  maxLength?: number;
}) {
  const error = useControlError(label);
  return (
    <label className={`${wide ? "sm:col-span-2" : ""} text-sm font-medium`}>
      {label}
      {required && <span className="text-primary"> *</span>}
      <textarea
        rows={4}
        maxLength={maxLength}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${adminInput} mt-2 resize-y ${error ? "border-red-400/70 focus:border-red-400 focus:ring-red-400/20" : ""}`}
      />
      <FieldError message={error} />
    </label>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: unknown;
  options: string[];
  onChange: (value: string) => void;
  help?: string;
}) {
  const error = useControlError(label);
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${adminInput} mt-2 ${error ? "border-red-400/70 focus:border-red-400 focus:ring-red-400/20" : ""}`}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      {help && (
        <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
          {help}
        </span>
      )}
      <FieldError message={error} />
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: unknown;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const error = useControlError(label);
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={Number(value ?? 0)}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-invalid={Boolean(error)}
        className={`${adminInput} mt-2 ${error ? "border-red-400/70 focus:border-red-400 focus:ring-red-400/20" : ""}`}
      />
      <FieldError message={error} />
    </label>
  );
}
function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const error = useControlError(label);
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[hsl(var(--admin-border))] p-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-cyan-400"
      />
      {label}
    </label>
  );
}
function DateField({
  label,
  value,
  timezone,
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  timezone: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const error = useControlError(label);
  return (
    <label className="text-sm font-medium">
      {label}
      {optional && (
        <span className="font-normal text-muted-foreground"> (optional)</span>
      )}
      <input
        type="datetime-local"
        value={toEventDateTimeLocal(value, timezone)}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${adminInput} mt-2 ${error ? "border-red-400/70 focus:border-red-400 focus:ring-red-400/20" : ""}`}
      />
      <FieldError message={error} />
    </label>
  );
}
function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: string[]) => void;
}) {
  const shown = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  return (
    <label className="text-sm font-medium">
      {label}
      <textarea
        rows={3}
        value={shown}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(/[\n,]/u)
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
        className={`${adminInput} mt-2 resize-y`}
        placeholder="One item per line"
      />
    </label>
  );
}
function PaymentMethods({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const error = useContext(EventValidationContext).paymentMethods?.[0];
  return (
    <fieldset
      aria-invalid={Boolean(error)}
      className={`rounded-xl border p-3 ${error ? "border-red-400/70" : "border-[hsl(var(--admin-border))]"}`}
    >
      <legend className="px-1 text-sm font-medium">Payment methods</legend>
      <div className="mt-1 flex flex-wrap gap-4">
        {["BKASH", "NAGAD", "CASH"].map((method) => (
          <label key={method} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.includes(method)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...new Set([...value, method])]
                    : value.filter((item) => item !== method),
                )
              }
            />
            {method}
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}
function GalleryField({
  images,
  title,
  csrfToken,
  onChange,
}: {
  images: EventMediaReference[];
  title: string;
  csrfToken?: string;
  onChange: (images: EventMediaReference[]) => void;
}) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-sm font-medium">Gallery Images</p>
      {images.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <div
              key={`${image.key || image.url}-${index}`}
              className="overflow-hidden rounded-xl border border-[hsl(var(--admin-border))]"
            >
              <img
                src={image.url}
                alt={image.altText || `${title} gallery ${index + 1}`}
                className="aspect-video w-full object-cover"
              />
              <div className="space-y-2 p-3">
                <input
                  value={image.altText || ""}
                  onChange={(event) =>
                    onChange(
                      images.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, altText: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Alt text"
                  className={adminInput}
                />
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className={adminSecondaryButton}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => move(index, 1)}
                    className={adminSecondaryButton}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(images.filter((_, item) => item !== index))
                    }
                    className={adminSecondaryButton}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <details className="rounded-xl border border-[hsl(var(--admin-border))] p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Add a gallery image
        </summary>
        <div className="mt-4">
          <HeroImageField
            value={null}
            altText=""
            title="Gallery Image"
            purpose="gallery"
            helpText="Upload once or reuse an existing Media Library image."
            csrfToken={csrfToken}
            onChange={(media) => {
              if (
                media &&
                !images.some(
                  (item) => item.key === media.key && item.url === media.url,
                )
              )
                onChange([
                  ...images,
                  {
                    ...media,
                    altText:
                      media.altText ||
                      `${title} gallery image ${images.length + 1}`,
                  },
                ]);
            }}
            onAltTextChange={() => undefined}
            onUploadingChange={() => undefined}
          />
        </div>
      </details>
    </div>
  );
}
