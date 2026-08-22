import { Hono } from "hono";
import type { AppEnvironment } from "../types";

export const sitemapRoutes = new Hono<AppEnvironment>();

const staticPaths = [
  "/", "/about", "/projects", "/projects/submit", "/events", "/partners",
  "/opportunities", "/alumni", "/alumni/apply", "/members", "/team", "/gallery",
  "/join", "/contact", "/collaborate", "/blog", "/research", "/research/submit",
  "/courses", "/verify",
];

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

sitemapRoutes.get("/sitemap.xml", async (context) => {
  const queries = await Promise.all([
    context.env.DB.prepare("SELECT '/events/'||slug AS path,updated_at FROM managed_events WHERE workflow_status='PUBLISHED'").all<{path:string;updated_at:string}>(),
    context.env.DB.prepare("SELECT '/people/'||slug AS path,updated_at FROM people_profiles WHERE workflow_status='PUBLISHED'").all<{path:string;updated_at:string}>(),
    context.env.DB.prepare("SELECT '/partners/'||slug AS path,updated_at FROM partner_profiles WHERE workflow_status='PUBLISHED' AND active=1").all<{path:string;updated_at:string}>(),
    context.env.DB.prepare("SELECT '/opportunities/'||slug AS path,updated_at FROM opportunities WHERE workflow_status='PUBLISHED'").all<{path:string;updated_at:string}>(),
    context.env.DB.prepare("SELECT '/projects/'||json_extract(data_json,'$.slug') AS path,updated_at FROM website_content_items WHERE collection_key='projects' AND status='PUBLISHED' AND json_extract(data_json,'$.slug') IS NOT NULL").all<{path:string;updated_at:string}>(),
    context.env.DB.prepare("SELECT '/research/'||slug AS path,updated_at FROM research_works WHERE workflow_status='PUBLISHED'").all<{path:string;updated_at:string}>(),
    context.env.DB.prepare("SELECT '/courses/'||id AS path,updated_at FROM learning_courses WHERE status='PUBLISHED'").all<{path:string;updated_at:string}>(),
    context.env.DB.prepare("SELECT '/blog/'||json_extract(data_json,'$.slug') AS path,updated_at FROM website_content_items WHERE collection_key='blog_posts' AND status='PUBLISHED' AND json_extract(data_json,'$.slug') IS NOT NULL").all<{path:string;updated_at:string}>(),
  ]);
  const origin=context.env.SITE_URL.replace(/\/$/u,"");
  const urls=[
    ...staticPaths.map((path)=>({path,updated_at:null as string|null})),
    ...queries.flatMap((result)=>result.results),
  ];
  const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((entry)=>`  <url><loc>${xml(`${origin}${entry.path}`)}</loc>${entry.updated_at?`<lastmod>${xml(entry.updated_at.slice(0,10))}</lastmod>`:""}</url>`).join("\n")}\n</urlset>`;
  return context.body(body,200,{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=300, s-maxage=300"});
});
