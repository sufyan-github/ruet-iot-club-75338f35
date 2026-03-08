import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";

const Gallery = () => {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("activity_photos").select("*").order("created_at", { ascending: false });
      setPhotos(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Gallery" subtitle="Moments from our journey" />

          {loading ? (
            <p className="text-center text-muted-foreground">Loading gallery...</p>
          ) : photos.length === 0 ? (
            <p className="text-center text-muted-foreground">Photos coming soon. Follow us on social media for the latest updates!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square rounded-xl glass overflow-hidden relative group cursor-pointer"
                >
                  <img src={getOptimizedImageUrl(photo.image_url, { width: 400, height: 400 })} alt={photo.title || "Activity"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-3 left-3 right-3">
                      {photo.title && <h4 className="font-semibold text-sm text-foreground">{photo.title}</h4>}
                      {photo.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{photo.description}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedPhoto(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="max-w-3xl w-full rounded-2xl overflow-hidden glass" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.image_url} alt={selectedPhoto.title || "Activity"} className="w-full max-h-[70vh] object-contain bg-background" />
            <div className="p-4">
              {selectedPhoto.title && <h3 className="font-semibold text-foreground">{selectedPhoto.title}</h3>}
              {selectedPhoto.description && <p className="text-sm text-muted-foreground mt-1">{selectedPhoto.description}</p>}
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
};

export default Gallery;
