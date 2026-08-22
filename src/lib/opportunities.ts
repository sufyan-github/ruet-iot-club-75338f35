export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  organization: string;
  opportunityType: string;
  featured: boolean;
  applicationOpensAt: string | null;
  applicationDeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  eligibility: string | null;
  whoCanApply: string | null;
  academicLevel: string | null;
  department: string | null;
  series: string | null;
  location: string | null;
  applicationMode: "INTERNAL" | "EXTERNAL";
  applicationUrl: string | null;
  contactEmail: string | null;
  requiredDocuments: string[];
  coverImageUrl: string | null;
  logoUrl: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
}

export function opportunityState(item: Opportunity) {
  const now = Date.now();
  const opensAt = item.applicationOpensAt ? new Date(item.applicationOpensAt).getTime() : 0;
  const deadline = item.applicationDeadline ? new Date(item.applicationDeadline).getTime() : Number.MAX_SAFE_INTEGER;
  if (opensAt > now) return "UPCOMING";
  if (deadline < now) return "CLOSED";
  if (deadline - now < 7 * 86_400_000) return "CLOSING SOON";
  return "OPEN";
}
