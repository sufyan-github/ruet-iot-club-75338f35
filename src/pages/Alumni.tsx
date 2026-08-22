import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { apiRequest } from "@/lib/api";

interface AlumniProfile { id: string; name: string; department: string | null; batch: string | null; graduationYear: number | null; formerClubPosition: string | null; organization: string | null; designation: string | null; country: string | null; linkedin: string | null; github: string | null; portfolio: string | null; photoUrl: string; }

export default function Alumni() {
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void apiRequest<AlumniProfile[]>("/alumni").then(setAlumni).finally(() => setLoading(false)); }, []);
  return <Layout><SEO title="Alumni Network | RUET IoT Club" description="Meet verified RUET IoT Club alumni building careers in IoT, embedded systems, and technology." path="/alumni" />
    <section className="py-20"><div className="container"><SectionHeading level={1} title="Alumni Network" subtitle="Verified former members making an impact around the world" />
      {loading ? <p className="text-center text-muted-foreground">Loading verified alumni…</p> : alumni.length === 0 ? <div className="mx-auto max-w-2xl rounded-2xl glass p-8 text-center"><h2 className="text-xl font-semibold">The verified alumni network is being built</h2><p className="mt-3 text-muted-foreground">No profile is published automatically. Alumni must apply through an email-verified account and pass administrator review.</p></div> : <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{alumni.map((profile, index) => <motion.article key={profile.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04 }} className="rounded-xl glass p-6 text-center"><div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-primary/10"><img src={profile.photoUrl} alt={`Portrait of ${profile.name}`} loading="lazy" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><h2 className="mt-4 font-semibold">{profile.name}</h2>{profile.formerClubPosition && <p className="mt-1 text-sm text-primary">{profile.formerClubPosition}</p>}<p className="mt-2 text-xs text-muted-foreground">{[profile.department, profile.batch && `Batch ${profile.batch}`, profile.graduationYear].filter(Boolean).join(" · ")}</p>{(profile.designation || profile.organization) && <p className="mt-3 text-sm">{[profile.designation, profile.organization].filter(Boolean).join(" at ")}</p>}<div className="mt-4 flex justify-center gap-3">{profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${profile.name} on LinkedIn`} className="text-muted-foreground hover:text-primary"><Linkedin size={18} /></a>}{profile.github && <a href={profile.github} target="_blank" rel="noopener noreferrer" aria-label={`${profile.name} on GitHub`} className="text-muted-foreground hover:text-primary"><Github size={18} /></a>}</div></motion.article>)}</div>}
      <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center"><h2 className="font-display text-2xl font-bold">Are you a RUET IoT Club Alumni?</h2><p className="mt-3 text-muted-foreground">Reconnect with the community through a verified profile. Your information stays private until review and approval.</p><Link to="/alumni/apply" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">Apply as Alumni</Link></div>
    </div></section></Layout>;
}
