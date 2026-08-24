import { useEffect, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import iotClubLogo from "@/assets/iot_club_logo.png";
import ruetLogo from "@/assets/ruet_logo.png";
import signature from "@/assets/signature.jpg";
import { cloudflareData } from "@/integrations/cloudflare/client";
import { apiRequest } from "@/lib/api";

interface CertificateRecord {
  id: string;
  certificate_number: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  completion_date?: string;
  status?: string;
  holder_name?: string;
  course_title?: string;
}

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

export default function Certificate() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const issued = await apiRequest<any>(`/certificates/${encodeURIComponent(id)}`);
        setCertificate({ id: issued.id, certificate_number: issued.certificateNumber, user_id: issued.userId, course_id: issued.courseId, issued_at: issued.issuedAt, completion_date: issued.completionDate, status: issued.status, holder_name: issued.student, course_title: issued.course });
        setCourse({ title: issued.course });
        setProfile({ full_name: issued.student });
      } catch {
        const { data: cert } = await cloudflareData.from("certificates").select("*").eq("id", id).single();
        if (cert) {
          setCertificate(cert as CertificateRecord);
          const [{ data: courseData }, { data: holders }] = await Promise.all([
            cloudflareData.from("courses").select("*").eq("id", cert.course_id).single(),
            cloudflareData.rpc("get_certificate_holder", { _user_id: cert.user_id }),
          ]);
          setCourse(courseData);
          setProfile(Array.isArray(holders) ? holders[0] ?? null : null);
        }
      } finally { setLoading(false); }
    };
    void load();
  }, [id]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading certificate…</main>;
  if (!certificate || !course) return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">Certificate not found.</main>;

  const revoked = certificate.status?.toUpperCase() === "REVOKED";
  const issuedDate = formatDate(certificate.issued_at);
  const completionDate = formatDate(certificate.completion_date || certificate.issued_at);
  const holder = certificate.holder_name || profile?.full_name || "Learner";
  const courseTitle = certificate.course_title || course.title;
  const verificationUrl = `${window.location.origin}/verify-certificate/${certificate.certificate_number}`;

  return <main className="certificate-page min-h-screen bg-[#090d16] px-2 py-5 sm:px-5 sm:py-8">
    <div className="certificate-actions mx-auto mb-5 flex max-w-[1180px] flex-wrap items-center justify-between gap-3 text-white print:hidden">
      <div><p className="text-sm font-semibold">Official RUET IoT Club certificate</p><p className="text-xs text-white/55">Designed for A4 landscape printing.</p></div>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"><Download size={17} />Download / Print</button>
    </div>

    <section className="certificate-sheet relative mx-auto aspect-[1.4097/1] w-full max-w-[1180px] overflow-hidden bg-white text-[#080b19] shadow-[0_28px_90px_-35px_rgba(40,210,255,.4)]">
      <div className="certificate-pattern absolute inset-0 opacity-70" />
      <div className="certificate-ribbon certificate-ribbon-left absolute left-0 top-[34%] h-[37%] w-[4.1%]" />
      <div className="certificate-ribbon certificate-ribbon-right absolute right-0 top-[34%] h-[37%] w-[4.1%]" />

      <div className="absolute inset-x-[6.6%] top-[4.4%] z-10 flex items-start justify-between">
        <div className="flex items-center gap-[1vw]"><img src={iotClubLogo} alt="RUET IoT Club logo" className="h-[clamp(38px,6.4vw,90px)] w-[clamp(38px,6.4vw,90px)] shrink-0 object-contain" /><div className="hidden sm:block"><p className="text-[clamp(9px,1vw,14px)] font-bold uppercase tracking-[.13em] text-[#211f75]">RUET IoT Club</p><p className="max-w-[230px] text-[clamp(6px,.62vw,9px)] uppercase tracking-[.12em] text-slate-500">Innovation · Learning · Impact</p></div></div>
        <div className="flex items-center gap-[1vw] text-right"><div className="hidden sm:block"><p className="text-[clamp(9px,1vw,14px)] font-bold uppercase tracking-[.13em] text-[#211f75]">RUET</p><p className="max-w-[270px] text-[clamp(6px,.62vw,9px)] uppercase tracking-[.1em] text-slate-500">Rajshahi University of Engineering &amp; Technology</p></div><img src={ruetLogo} alt="RUET logo" className="h-[clamp(38px,6.4vw,90px)] w-[clamp(38px,6.4vw,90px)] shrink-0 object-contain" /></div>
      </div>

      <div className="absolute inset-x-[6.8%] top-[17%] z-10 flex items-start justify-between gap-6">
        <div><h1 className="font-serif text-[clamp(25px,6.2vw,82px)] leading-[.8] tracking-[-.04em] text-black">CERTIFICATE</h1><p className="mt-[1.5%] text-center font-serif text-[clamp(11px,2.3vw,31px)] tracking-[.19em]">OF COMPLETION</p></div>
        <div className="mt-[1.2%] flex items-center gap-[1vw]"><p className="font-serif text-[clamp(12px,2.15vw,31px)] font-bold uppercase">Course Graduate</p><span className="h-[clamp(19px,3.2vw,46px)] w-[clamp(6px,.9vw,13px)] bg-gradient-to-b from-[#11115d] to-[#4537e6]" /></div>
      </div>

      <div className="absolute inset-x-[6.8%] top-[38%] z-10">
        <p className="font-serif text-[clamp(17px,3.15vw,44px)] font-bold uppercase leading-none">{holder}</p>
        <div className="mt-[2.2%] h-[2px] w-[42%] bg-black"><span className="block size-[8px] -translate-y-[3px] border-2 border-black bg-white" /></div>
        <p className="mt-[2.2%] max-w-[91%] font-serif text-[clamp(8px,1.45vw,20px)] leading-[1.42] tracking-[.055em]">This certificate is proudly awarded in recognition of the successful completion of <strong>{courseTitle}</strong> on {completionDate}. The learner&apos;s dedication, practical engagement, and commitment to innovation and IoT-based learning at Rajshahi University of Engineering &amp; Technology are sincerely appreciated.</p>
      </div>

      <div className="absolute bottom-[10%] left-[8.7%] z-10 flex w-[52%] items-end gap-[12%]">
        <div className="w-[46%] text-center"><div className="mx-auto mb-[1%] h-[clamp(18px,3.6vw,48px)]" /><div className="border-t-2 border-black pt-[2%]"><p className="text-[clamp(7px,1.32vw,18px)] font-bold">Dr. Md. Masud Rana</p><p className="text-[clamp(5px,.9vw,13px)] italic tracking-[.08em]">Chief Advisor, RUET IoT Club</p></div></div>
        <div className="w-[42%] text-center"><img src={signature} alt="Authorized signature" className="mx-auto mb-[-1%] h-[clamp(22px,4.4vw,58px)] w-[80%] object-contain mix-blend-multiply" /><div className="border-t-2 border-black pt-[2%]"><p className="text-[clamp(7px,1.32vw,18px)] font-bold">Md. Abu Sufyan</p><p className="text-[clamp(5px,.9vw,13px)] italic tracking-[.08em]">President, RUET IoT Club</p></div></div>
      </div>

      <div className="absolute bottom-[7.5%] right-[7.5%] z-10 flex w-[25%] flex-col items-center text-center"><img src={iotClubLogo} alt="RUET IoT Club seal" className="h-[clamp(38px,8.8vw,118px)] w-[clamp(38px,8.8vw,118px)] object-contain" /><div className="mt-[2%] flex items-center gap-1 text-[clamp(5px,.72vw,10px)] text-slate-600"><ShieldCheck className="h-[1.1em] w-[1.1em] text-[#302ea8]" />{certificate.certificate_number}</div><p className="mt-[1%] text-[clamp(4px,.58vw,8px)] text-slate-400">Issued {issuedDate}</p></div>
      {revoked && <div className="absolute inset-0 z-30 grid place-items-center bg-white/78"><div className="-rotate-12 border-[clamp(3px,.7vw,9px)] border-red-600 px-[4%] py-[1.5%] text-[clamp(24px,7vw,92px)] font-black uppercase tracking-[.1em] text-red-600">Revoked</div></div>}
    </section>

    <div className="mx-auto mt-5 max-w-[1180px] text-center text-xs text-white/55 print:hidden"><p>Certificate ID: <span className="font-mono text-cyan-300">{certificate.certificate_number}</span></p><p className="mt-1 break-all">Verify: {verificationUrl}</p></div>
    <style>{`
      .certificate-pattern { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='none' stroke='%2360cce6' stroke-width='2' opacity='.17'%3E%3Ccircle cx='34' cy='35' r='15'/%3E%3Ccircle cx='34' cy='35' r='4'/%3E%3Cpath d='M34 20V8M19 35H7M49 35h12M34 50v12M97 20h31v24H97zM104 27h17M104 35h11M83 101l17-17 17 17-17 17zM139 116c21 0 21 33 0 33s-21-33 0-33zM34 112h28v28H34zM41 105v42M55 105v42M27 119h42M27 133h42'/%3E%3C/g%3E%3Cg fill='none' stroke='%238d72ee' stroke-width='2' opacity='.10' transform='translate(76 66)'%3E%3Ccircle cx='36' cy='36' r='18'/%3E%3Cpath d='M36 8v11M36 53v11M8 36h11M53 36h11M17 17l8 8M47 47l8 8M55 17l-8 8M25 47l-8 8'/%3E%3C/g%3E%3C/svg%3E"); background-size: 180px 180px; }
      .certificate-ribbon { background: linear-gradient(180deg,#171461 0 34%,#fff 34% 40%,#3b31d6 40% 66%,#fff 66% 72%,#171461 72%); clip-path: polygon(0 0,100% 13%,100% 100%,0 87%); }
      .certificate-ribbon-right { transform: scaleX(-1); }
      @media print { html,body,#root { margin:0!important; padding:0!important; background:white!important; } .certificate-page { min-height:0!important; padding:0!important; background:white!important; } .certificate-sheet { width:100vw!important; max-width:none!important; height:100vh!important; aspect-ratio:auto!important; box-shadow:none!important; } .print\\:hidden { display:none!important; } @page { size:A4 landscape; margin:0; } * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; } }
    `}</style>
  </main>;
}
