import { motion } from "framer-motion";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  level?: 1 | 2;
}

const SectionHeading = ({
  title,
  subtitle,
  align = "center",
  level = 2,
}: SectionHeadingProps) => {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`mb-12 ${align === "center" ? "text-center" : ""}`}
    >
      <Heading className="font-display text-2xl font-bold tracking-tight md:text-3xl">
        <span className="text-gradient">{title}</span>
      </Heading>
      <div
        aria-hidden="true"
        className={`tech-divider mt-4 h-px w-24 ${align === "center" ? "mx-auto" : ""}`}
      />
      {subtitle && (
        <p
          className={`mt-4 max-w-2xl leading-relaxed text-muted-foreground ${align === "center" ? "mx-auto" : ""}`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

export default SectionHeading;
