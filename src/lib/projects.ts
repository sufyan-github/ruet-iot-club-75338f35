export type ProjectLifecycleStatus = "PLANNED" | "ONGOING" | "COMPLETED";
export type ProjectPublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ProjectImage {
  key: string;
  url: string;
  originalName?: string;
  alt?: string;
  contentType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
}

export interface ProjectRecord {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  projectStatus: ProjectLifecycleStatus;
  publicationStatus: ProjectPublicationStatus;
  category: string;
  projectLead: string;
  teamMembers: string[];
  startDate: string | null;
  expectedCompletionDate: string | null;
  actualCompletionDate: string | null;
  coverImage: ProjectImage | null;
  gallery: ProjectImage[];
  technologies: string[];
  tags: string[];
  objectives: string[];
  features: string[];
  outcomes: string;
  partners: string[];
  projectUrl: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  sortOrder: number;
  advanced: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface ProjectStats {
  total: number;
  ongoing: number;
  completed: number;
  planned: number;
  drafts: number;
}

export interface ProjectListResponse {
  items: ProjectRecord[];
  stats: ProjectStats;
  facets: { categories: string[]; leads: string[] };
}

export interface ProjectOptions {
  people: Array<{ id: string; name: string }>;
  partners: Array<{ id: string; name: string }>;
}

export const projectSlug = (value: string) => value.normalize("NFKD")
  .replace(/[\u0300-\u036f]/gu, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/gu, "-")
  .replace(/^-+|-+$/gu, "")
  .slice(0, 180);

export const projectStatusLabel = (value: string) => value.replace(/_/gu, " ").toLowerCase().replace(/\b\w/gu, (letter) => letter.toUpperCase());
