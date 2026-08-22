import { Link, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

export default function NotFound() {
  const location = useLocation();
  return <Layout><SEO title="Page Not Found | RUET IoT Club" description="The requested RUET IoT Club page could not be found." path={location.pathname} /><section className="py-24"><div className="container max-w-xl rounded-2xl glass p-10 text-center"><p className="font-mono text-sm text-primary">404</p><h1 className="mt-3 font-display text-3xl font-bold">Page not found</h1><p className="mt-3 text-muted-foreground">The page may have moved, or the address may be incorrect.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/" className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Return home</Link><Link to="/contact" className="rounded-lg border border-border px-5 py-3 font-semibold hover:border-primary/40">Contact the club</Link></div></div></section></Layout>;
}
