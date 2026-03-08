import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Award, Download, Calendar, User, BookOpen } from "lucide-react";
import logo from "@/assets/logo.png";

const Certificate = () => {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
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
    if (id) fetch();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Actions */}
        <div className="flex justify-center gap-3 mb-6 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Download size={16} /> Download / Print
          </button>
        </div>

        {/* Certificate */}
        <div
          ref={certRef}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none"
          style={{ aspectRatio: "1.414/1" }}
        >
          {/* Decorative border */}
          <div className="h-full p-8 relative">
            {/* Border decoration */}
            <div className="absolute inset-4 border-4 border-double border-primary/30 rounded-xl pointer-events-none" />
            <div className="absolute inset-6 border border-primary/20 rounded-lg pointer-events-none" />

            {/* Content */}
            <div className="h-full flex flex-col items-center justify-between py-8 px-6 relative z-10">
              {/* Header */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <img src={logo} alt="RUET IoT Club" className="w-14 h-14" />
                  <div className="text-left">
                    <h1 className="text-xl font-bold text-gray-800 tracking-wide">RUET IoT Club</h1>
                    <p className="text-xs text-gray-500">Learning Management System</p>
                  </div>
                </div>
                <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
                <h2 className="text-3xl font-serif font-bold text-gray-700 tracking-widest uppercase">
                  Certificate of Completion
                </h2>
              </div>

              {/* Body */}
              <div className="text-center flex-1 flex flex-col justify-center">
                <p className="text-gray-600 text-sm mb-2">This is to certify that</p>
                <h3 className="text-3xl font-serif font-bold text-primary mb-4 border-b-2 border-primary/30 pb-2 px-8 inline-block">
                  {profile?.full_name || "Student"}
                </h3>
                <p className="text-gray-600 text-sm mb-4">has successfully completed the course</p>
                <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg py-4 px-8 mb-4">
                  <h4 className="text-xl font-bold text-gray-800">{course.title}</h4>
                  {course.instructor && (
                    <p className="text-sm text-gray-500 mt-1">Instructed by {course.instructor}</p>
                  )}
                </div>
                <p className="text-gray-600 text-sm">
                  demonstrating proficiency and commitment to learning.
                </p>
              </div>

              {/* Footer */}
              <div className="w-full">
                <div className="flex items-end justify-between">
                  <div className="text-center">
                    <div className="w-32 border-t border-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">Authorized Signature</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Award className="text-primary" size={24} />
                      <span className="text-xs font-mono text-gray-500">{certificate.certificate_number}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <Calendar size={12} />
                      <span>
                        {new Date(certificate.issued_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-t border-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">Date of Issue</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification info */}
        <div className="mt-6 text-center print:hidden">
          <p className="text-xs text-muted-foreground">
            Certificate ID: <span className="font-mono text-primary">{certificate.certificate_number}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Verify at: {window.location.href}
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default Certificate;
