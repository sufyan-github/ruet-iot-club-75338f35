import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import EventEditorForm from "./EventEditorForm";

const baseDraft: Record<string, unknown> = {
  title: "Responsive Event Editor",
  slug: "responsive-event-editor",
  shortDescription: "A complete summary.",
  fullDescription: "<p>A complete description.</p>",
  eventType: "Workshop",
  category: "IoT",
  startsAt: "2026-09-01T04:00:00.000Z",
  endsAt: "2026-09-01T08:00:00.000Z",
  timezone: "Asia/Dhaka",
  locationType: "PHYSICAL",
  registrationRequired: false,
  registrationMode: "CLOSED",
  paymentRequired: false,
  maxParticipants: 50,
  paymentMethods: ["BKASH", "NAGAD"],
  organizer: "RUET IoT Club",
  certificateAvailable: false,
  workflowStatus: "DRAFT",
  galleryImages: [],
};

function StatefulEditor() {
  const [draft, setDraft] = useState(baseDraft);
  return (
    <EventEditorForm
      value={draft}
      onChange={(key, value) =>
        setDraft((current) => ({ ...current, [key]: value }))
      }
    />
  );
}

describe("EventEditorForm", () => {
  it("shows exact API validation messages, highlights fields, and opens advanced errors", () => {
    render(
      <EventEditorForm
        value={baseDraft}
        fieldErrors={{
          title: ["Event title must contain at least 3 characters."],
          canonicalUrl: ["Use an HTTPS URL."],
        }}
        onChange={() => undefined}
      />,
    );
    expect(
      screen.getAllByText("Event title must contain at least 3 characters."),
    ).toHaveLength(2);
    expect(screen.getByLabelText(/Event title/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByText("Advanced options").closest("details"),
    ).toHaveAttribute("open");
    const canonicalLabel = screen.getByText("Canonical URL").closest("label");
    expect(canonicalLabel?.querySelector("input")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("renders exactly one Hero Image control and keeps gallery and Open Graph media separate", () => {
    render(<StatefulEditor />);
    const heroHeading = screen.getByRole("heading", { name: "Hero Image" });
    expect(heroHeading.closest("details")).toBeNull();
    const primaryMediaControl = heroHeading.closest("section");
    expect(primaryMediaControl).not.toBeNull();
    if (primaryMediaControl)
      expect(
        within(primaryMediaControl).getByRole("button", {
          name: "Upload image",
        }),
      ).toBeInTheDocument();
    expect(document.querySelectorAll("details[open]")).toHaveLength(0);
    expect(screen.queryByLabelText("Slug")).not.toBeInTheDocument();

    const advanced = screen.getByText("Advanced options").closest("details");
    expect(advanced).not.toBeNull();
    if (advanced) advanced.open = true;
    expect(screen.getByText("Gallery Images")).toBeInTheDocument();
    if (advanced)
      expect(within(advanced).getByText("Slug")).toBeInTheDocument();
  });

  it("switches physical and online conditional fields without exposing contradictory inputs", () => {
    render(<StatefulEditor />);
    expect(screen.getByLabelText("Venue")).toBeInTheDocument();
    expect(screen.queryByLabelText("Meeting URL")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Location type"), {
      target: { value: "ONLINE" },
    });
    expect(screen.queryByLabelText("Venue")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Online platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Meeting URL")).toBeInTheDocument();
  });

  it("reveals payment fields only when registration and payment are enabled", () => {
    render(<StatefulEditor />);
    expect(screen.queryByLabelText("Payment required")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Registration required"));
    expect(screen.queryByLabelText(/Registration fee/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Payment required"));
    expect(screen.getByLabelText(/Registration fee/)).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Payment methods" }),
    ).toBeInTheDocument();
  });
});
