import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Award, Download, Calendar } from "lucide-react";
import iotClubLogo from "@/assets/iot_club_logo.png";
import ruetLogo from "@/assets/ruet_logo.png";
import signature from "@/assets/signature.jpg";

const Certificate = () => {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: cert } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", id)
        .single();

      if (cert) {
        setCertificate(cert);
        const { data: courseData } = await supabase
          .from("courses")
          .select("*")
          .eq("id", cert.course_id)
          .single();
        setCourse(courseData);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", cert.user_id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading certificate...</p>
      </div>
    );
  }

  if (!certificate || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Certificate not found.</p>
      </div>
    );
  }

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col items-center justify-start sm:justify-center py-4 sm:py-8 px-2 sm:px-4">
      {/* Actions */}
      <div className="flex justify-center gap-3 mb-4 sm:mb-6 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg"
        >
          <Download size={16} /> Download / Print
        </button>
      </div>

      {/* Certificate */}
      <div
        ref={certRef}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl print:shadow-none print:rounded-none w-full"
        style={{ maxWidth: "900px", aspectRatio: "1.414 / 1" }}
      >
        <div className="w-full h-full p-[4%] sm:p-[5%] relative">
          {/* Outer ornamental border */}
          <div className="absolute inset-[2%] sm:inset-[3%] border-2 sm:border-[3px] border-double border-primary/30 rounded-lg sm:rounded-xl pointer-events-none" />
          {/* Inner subtle border */}
          <div className="absolute inset-[4%] sm:inset-[5%] border border-primary/15 rounded-md sm:rounded-lg pointer-events-none" />

          {/* Corner ornaments - hidden on very small screens */}
          <div className="hidden sm:block absolute top-[3.5%] left-[3.5%] w-8 h-8 border-t-2 border-l-2 border-primary/40 rounded-tl-lg pointer-events-none" />
          <div className="hidden sm:block absolute top-[3.5%] right-[3.5%] w-8 h-8 border-t-2 border-r-2 border-primary/40 rounded-tr-lg pointer-events-none" />
          <div className="hidden sm:block absolute bottom-[3.5%] left-[3.5%] w-8 h-8 border-b-2 border-l-2 border-primary/40 rounded-bl-lg pointer-events-none" />
          <div className="hidden sm:block absolute bottom-[3.5%] right-[3.5%] w-8 h-8 border-b-2 border-r-2 border-primary/40 rounded-br-lg pointer-events-none" />

          {/* Content wrapper */}
          <div className="h-full flex flex-col items-center justify-between py-[3%] sm:py-[4%] px-[3%] sm:px-[6%] relative z-10">
            {/* Header */}
            <div className="text-center shrink-0 w-full">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <img src={iotClubLogo} alt="RUET IoT Club" className="w-10 h-10 sm:w-16 md:w-24 sm:h-16 md:h-24 object-contain" />
                <div className="text-center flex-1 px-2">
                  <h1 className="text-xs sm:text-lg md:text-2xl font-bold text-gray-800 tracking-wide leading-tight">RUET IoT Club</h1>
                  <p className="text-[6px] sm:text-[10px] md:text-xs text-gray-500 tracking-wider uppercase">Learning Management System</p>
                </div>
                <img src={ruetLogo} alt="RUET" className="w-10 h-10 sm:w-16 md:w-24 sm:h-16 md:h-24 object-contain" />
              </div>
              <div className="w-12 sm:w-20 h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-1 sm:mb-3" />
              <h2 className="text-[10px] sm:text-xl md:text-3xl font-serif font-bold text-gray-700 tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-tight">
                Certificate of Completion
              </h2>
            </div>

            {/* Body */}
            <div className="text-center flex-1 flex flex-col justify-center min-h-0 py-1 sm:py-2">
              <p className="text-gray-500 text-[7px] sm:text-xs mb-0.5 sm:mb-1.5 tracking-wide">This is to certify that</p>
              <h3 className="text-sm sm:text-2xl md:text-3xl font-serif font-bold text-primary mb-1 sm:mb-3 border-b sm:border-b-2 border-primary/30 pb-0.5 sm:pb-1.5 px-3 sm:px-6 inline-block mx-auto">
                {profile?.full_name || "Student"}
              </h3>
              <p className="text-gray-500 text-[7px] sm:text-xs mb-1 sm:mb-3 tracking-wide">has successfully completed the course</p>
              <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded sm:rounded-lg py-1.5 sm:py-3 px-3 sm:px-6 mb-1 sm:mb-3 mx-auto max-w-md">
                <h4 className="text-[9px] sm:text-base md:text-lg font-bold text-gray-800 leading-tight">{course.title}</h4>
                {course.instructor && (
                  <p className="text-[6px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Instructed by {course.instructor}</p>
                )}
              </div>
              <p className="text-gray-500 text-[7px] sm:text-xs tracking-wide">
                demonstrating proficiency and commitment to learning.
              </p>
            </div>

            {/* Footer */}
            <div className="w-full shrink-0">
              <div className="flex items-end justify-between px-0 sm:px-2">
                {/* Signature */}
                <div className="text-center w-16 sm:w-28 md:w-36">
                  <img src={signature} alt="Authorized Signature" className="h-5 sm:h-8 md:h-10 object-contain mx-auto mb-0.5" />
                  <div className="w-full border-t border-gray-400 mb-0.5" />
                  <p className="text-[5px] sm:text-[10px] text-gray-500">Authorized Signature</p>
                </div>

                {/* Certificate ID */}
                <div className="text-center">
                  <Award className="text-primary mx-auto mb-0.5 sm:mb-1" size={14} />
                  <span className="text-[5px] sm:text-[10px] font-mono text-gray-500 block">{certificate.certificate_number}</span>
                </div>

                {/* Date */}
                <div className="text-center w-16 sm:w-28 md:w-36">
                  <p className="text-[7px] sm:text-sm font-medium text-gray-700 mb-0.5">
                    {issuedDate}
                  </p>
                  <div className="w-full border-t border-gray-400 mb-0.5" />
                  <p className="text-[5px] sm:text-[10px] text-gray-500">Date of Completion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification info */}
      <div className="mt-4 sm:mt-6 text-center print:hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Certificate ID: <span className="font-mono text-primary">{certificate.certificate_number}</span>
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
          Verify at: {window.location.href}
        </p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          html, body { margin: 0; padding: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default Certificate;
