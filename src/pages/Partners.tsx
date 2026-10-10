import { useEffect, useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { apiRequest } from "@/lib/api";
export interface Partner {
  id: string;
  slug: string;
  organizationName: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  shortDescription: string;
  fullDescription: string;
  category: string;
  country: string | null;
  city: string | null;
  websiteUrl: string | null;
  partnershipType: string | null;
  startsOn: string | null;
  endsOn: string | null;
  featured: boolean;
  seoTitle: string | null;
  metaDescription: string | null;
}
const group = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("government")) return "Government & Public Institutions";
  if (
    value.includes("university") ||
    value.includes("education") ||
    value.includes("research")
  )
    return "Educational & Research Institutions";
  if (
    value.includes("ngo") ||
    value.includes("development") ||
    value.includes("community")
  )
    return "NGO & Development Partners";
  if (value.includes("international")) return "International Partners";
  if (
    value.includes("corporate") ||
    value.includes("technology") ||
    value.includes("startup") ||
    value.includes("industry")
  )
    return "Corporate & Technology Partners";
  return "Strategic Partners";
};
export default function Partners() {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  useEffect(() => {
    void apiRequest<Partner[]>("/community/partners")
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);
  const categories = Array.from(
    new Set(items.map((item) => item.category)),
  ).sort();
  const visible = items.filter(
    (item) =>
      (!query ||
        `${item.organizationName} ${item.shortDescription} ${item.category}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!category || item.category === category),
  );
  const grouped = useMemo(
    () =>
      Object.entries(
        visible.reduce<Record<string, Partner[]>>((result, item) => {
          const key = group(item.category);
          (result[key] ??= []).push(item);
          return result;
        }, {}),
      ),
    [visible],
  );
  return (
    <Layout>
      <SEO
        title="Our Partners | RUET IoT Club"
        description="Meet the institutions, organizations, technology companies, NGOs, and strategic partners working with RUET IoT Club."
        path="/partners"
      />
      <section className="py-20">
        <div className="container">
          <SectionHeading
            level={1}
            title="Our Partners"
            subtitle="Organizations helping the RUET IoT community learn, build, research, and create impact"
          />
          <div className="mx-auto mb-12 grid max-w-4xl gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 md:grid-cols-[1fr_16rem]">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                aria-label="Search partners"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search organizations…"
                className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-sm"
              />
            </label>
            <select
              aria-label="Partner category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-border bg-secondary/50 px-4 text-sm"
            >
              <option value="">All partner categories</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="py-16 text-center text-muted-foreground">
              Loading partners…
            </p>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Building2 size={40} className="mx-auto text-primary/50" />
              <h2 className="mt-4 text-xl font-semibold">
                Partnership directory is being prepared
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Official active partners will appear here after publication.
              </p>
              <Link
                to="/collaborate"
                className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
              >
                Partner with us
              </Link>
            </div>
          ) : (
            <div className="space-y-16">
              {grouped.map(([name, partners]) => (
                <section key={name}>
                  <h2 className="text-2xl font-semibold">{name}</h2>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {partners.map((partner) => (
                      <Link
                        key={partner.id}
                        to={`/partners/${partner.slug}`}
                        className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:-translate-y-1 hover:border-primary/30"
                      >
                        {partner.logoUrl ? (
                          <img
                            src={partner.logoUrl}
                            alt={`${partner.organizationName} logo`}
                            className="h-20 w-full object-contain object-left"
                          />
                        ) : (
                          <Building2 size={42} className="text-primary/60" />
                        )}
                        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-primary">
                          {partner.category}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold group-hover:text-primary">
                          {partner.organizationName}
                        </h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {partner.shortDescription}
                        </p>
                        <p className="mt-4 text-sm font-semibold text-primary">
                          View partnership →
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
