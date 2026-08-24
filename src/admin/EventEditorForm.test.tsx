import { fireEvent, render, screen } from "@testing-library/react";
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
  registrationRequired: true,
  registrationMode: "INTERNAL",
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
  it("renders exactly one Hero Image control and keeps gallery and Open Graph media separate", () => {
    render(<StatefulEditor />);
    expect(screen.getAllByRole("heading", { name: "Hero Image" })).toHaveLength(
      1,
    );
    expect(screen.getByText("Gallery Images")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Open Graph Image" }),
    ).toBeInTheDocument();
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
    expect(
      screen.queryByLabelText(/Fee in minor units/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Payment required"));
    expect(screen.getByLabelText(/Fee in minor units/)).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Payment methods" }),
    ).toBeInTheDocument();
  });
});
