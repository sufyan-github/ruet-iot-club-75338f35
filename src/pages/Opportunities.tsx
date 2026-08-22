import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarClock, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { apiRequest } from "@/lib/api";
import { opportunityState, type Opportunity } from "@/lib/opportunities";
export default function Opportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [state, setState] = useState("ACTIVE");
  useEffect(() => {
    void apiRequest<Opportunity[]>("/community/opportunities")
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);
  const types = Array.from(
    new Set(items.map((item) => item.opportunityType)),
  ).sort();
  const visible = useMemo(
    () =>
      items
        .filter((item) => {
          const current = opportunityState(item);
          return (
            (!query ||
              `${item.title} ${item.organization} ${item.category} ${item.shortDescription}`
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (!type || item.opportunityType === type) &&
            (state === "ALL" ||
              (state === "ACTIVE" && current !== "CLOSED") ||
              current === state)
          );
        })
        .sort(
          (a, b) =>
            (a.applicationDeadline
              ? new Date(a.applicationDeadline).getTime()
              : Number.MAX_SAFE_INTEGER) -
            (b.applicationDeadline
              ? new Date(b.applicationDeadline).getTime()
              : Number.MAX_SAFE_INTEGER),
        ),
    [items, query, type, state],
  );
  return (
    <Layout>
      <SEO
        title="Opportunities | RUET IoT Club"
        description="Explore scholarships, internships, fellowships, competitions, training, research opportunities, grants, and calls for applications."
        path="/opportunities"
      />
      <section className="py-20">
        <div className="container">
          <SectionHeading
            level={1}
            title="Opportunities"
            subtitle="Scholarships, internships, research calls, training, competitions, grants, and more"
          />
          <div className="mx-auto mb-12 grid max-w-5xl gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 md:grid-cols-[1fr_13rem_13rem]">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                aria-label="Search opportunities"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search opportunities…"
                className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 text-sm"
              />
            </label>
            <select
              aria-label="Opportunity type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-xl border border-border bg-secondary/50 px-3 text-sm"
            >
              <option value="">All types</option>
              {types.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              aria-label="Opportunity state"
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="rounded-xl border border-border bg-secondary/50 px-3 text-sm"
            >
              <option value="ACTIVE">Active opportunities</option>
              <option value="OPEN">Open</option>
              <option value="CLOSING SOON">Closing soon</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="CLOSED">Closed</option>
              <option value="ALL">All</option>
            </select>
          </div>
          {loading ? (
            <p className="py-16 text-center text-muted-foreground">
              Loading opportunities…
            </p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <BriefcaseBusiness
                size={42}
                className="mx-auto text-primary/50"
              />
              <h2 className="mt-4 text-xl font-semibold">
                No opportunities match these filters
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another category or check back when a new call opens.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {visible.map((item) => {
                const current = opportunityState(item);
                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-border/60 bg-card/50"
                  >
                    {item.coverImageUrl && (
                      <img
                        src={item.coverImageUrl}
                        alt=""
                        className="aspect-[16/7] w-full object-cover"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                          {item.opportunityType}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 ${current === "OPEN" ? "bg-emerald-400/10 text-emerald-300" : current === "CLOSING SOON" ? "bg-amber-400/10 text-amber-300" : "bg-secondary text-muted-foreground"}`}
                        >
                          {current}
                        </span>
                      </div>
                      <h2 className="mt-4 text-xl font-semibold">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-sm text-primary">
                        {item.organization}
                      </p>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {item.shortDescription}
                      </p>
                      {item.applicationDeadline && (
                        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarClock size={15} className="text-primary" />
                          Deadline:{" "}
                          {new Date(item.applicationDeadline).toLocaleString()}
                        </p>
                      )}
                      <Link
                        to={`/opportunities/${item.slug}`}
                        className="mt-5 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        {current === "CLOSED" ? "View details" : "Apply now"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
