import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  loading: false,
  user: null as { id: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import HomeMembershipLink from "./HomeMembershipLink";

const renderLink = () => render(
  <MemoryRouter>
    <HomeMembershipLink>{(state) => state === "authenticated" ? "Continue application" : "Join Us"}</HomeMembershipLink>
  </MemoryRouter>,
);

afterEach(() => {
  cleanup();
  authState.loading = false;
  authState.user = null;
});

describe("homepage membership CTA", () => {
  it("sends a guest to account registration", () => {
    renderLink();
    expect(screen.getByRole("link", { name: "Join Us" })).toHaveAttribute("href", "/auth?mode=signup");
  });

  it("sends an authenticated user to the membership application", () => {
    authState.user = { id: "member-1" };
    renderLink();
    expect(screen.getByRole("link", { name: "Continue application" })).toHaveAttribute("href", "/join");
  });

  it("uses the safe membership route while session state is loading", () => {
    authState.loading = true;
    renderLink();
    expect(screen.getByRole("link", { name: "Join Us" })).toHaveAttribute("href", "/join");
    expect(screen.getByRole("link", { name: "Join Us" })).toHaveAttribute("aria-busy", "true");
  });
});
