import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const heroState = vi.hoisted(() => ({ data: [] as Array<Record<string, unknown>> }));

vi.mock("@/integrations/cloudflare/client", () => {
  const builder = {
    select() { return builder; },
    order: async () => ({ data: heroState.data, error: null }),
  };
  return {
    cloudflareData: {
      from: () => builder,
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel: () => undefined,
    },
  };
});

import HeroCarousel from "./HeroCarousel";

describe("HeroCarousel", () => {
  beforeEach(() => {
    heroState.data = [];
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a clean managed fallback when no published Hero image exists", async () => {
    const { container } = render(<HeroCarousel />);
    expect(await screen.findByText("Build. Connect. Innovate.")).toBeInTheDocument();
    expect(container.querySelector('img[src*="activity-"]')).toBeNull();
  });

  it("renders the exact managed R2 reference and stored alt text", async () => {
    heroState.data = [{
      id: "hero-one",
      title: "Connected innovation",
      description: "Managed by D1.",
      image_key: "website/2026-08-22/hero-lab.png",
      image_url: "/api/v1/media/files/website/2026-08-22/hero-lab.png",
      image_alt: "Students collaborating in the IoT laboratory",
    }];
    render(<HeroCarousel />);
    const image = await screen.findByAltText("Students collaborating in the IoT laboratory");
    await waitFor(() => expect(image).toHaveAttribute("src", "/api/v1/media/files/website/2026-08-22/hero-lab.png"));
  });
});
