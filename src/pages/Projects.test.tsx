import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Projects from "./Projects";
import ProjectDetail from "./ProjectDetail";

vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/SEO", () => ({ default: ({ title }: { title: string }) => <div data-testid="seo-title">{title}</div> }));
vi.mock("@/components/SectionHeading", () => ({ default: ({ title, subtitle }: { title: string; subtitle: string }) => <header><h1>{title}</h1><p>{subtitle}</p></header> }));
vi.mock("framer-motion", () => ({ motion: { article: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <article {...props}>{children}</article> } }));

const project = {
  id: "project-1",
  title: "Accessible Sensor Network",
  slug: "accessible-sensor-network",
  shortDescription: "A published project without a fabricated cover image.",
  description: "A complete public description.",
  projectStatus: "ONGOING",
  publicationStatus: "PUBLISHED",
  category: "IoT",
  projectLead: "Project Lead",
  teamMembers: ["Team Member"],
  startDate: "2026-01-10",
  expectedCompletionDate: "2026-12-10",
  actualCompletionDate: null,
  coverImage: null,
  gallery: [],
  technologies: ["ESP32"],
  tags: ["Sensors"],
  objectives: ["Build a reliable network"],
  features: ["Remote monitoring"],
  outcomes: "Pilot testing is underway.",
  partners: ["RUET IoT Club"],
  projectUrl: null,
  githubUrl: "https://github.com/example/project",
  demoUrl: null,
  sortOrder: 0,
  advanced: {},
  createdAt: "2026-01-10T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
  publishedAt: "2026-08-20T00:00:00.000Z",
  archivedAt: null,
};

function mockApi(data: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data }), {
    status: 200, headers: { "Content-Type": "application/json" },
  })));
}

afterEach(() => vi.unstubAllGlobals());

describe("public project portfolio", () => {
  it("renders a published no-image project as a detail link without fake imagery", async () => {
    mockApi({ items: [project], count: 1 });
    render(<MemoryRouter initialEntries={["/projects"]}><Projects /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByLabelText("No project image provided")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /accessible sensor network|view project/iu }).some((link) => link.getAttribute("href") === "/projects/accessible-sensor-network")).toBe(true);
  });

  it("renders the public detail route with structured project data", async () => {
    mockApi(project);
    render(<MemoryRouter initialEntries={["/projects/accessible-sensor-network"]}><Routes><Route path="/projects/:slug" element={<ProjectDetail />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Objectives" })).toBeInTheDocument();
    expect(screen.getByText("Remote monitoring")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub Repository" })).toHaveAttribute("href", project.githubUrl);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/v1/projects/accessible-sensor-network", expect.objectContaining({ credentials: "include" })));
  });
});
