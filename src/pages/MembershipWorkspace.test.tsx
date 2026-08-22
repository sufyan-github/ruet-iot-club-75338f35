import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentRequestForm } from "./MembershipWorkspace";

const request = {
  paymentRequestId: "payment-request-1",
  applicationId: "application-1",
  expectedAmountMinor: 30000,
  currency: "BDT",
  paymentMethodsJson: '["BKASH","NAGAD"]',
  paymentNumber: "01580352238",
  paymentInstructions:
    "Use Send Money only after this official request appears in your workspace.",
  requestedAt: "2026-08-23T00:00:00.000Z",
  reason: "Membership application review completed.",
};

describe("PaymentRequestForm", () => {
  it("shows only the server-issued amount, receiver, and approved payment channels", () => {
    const onPaymentMethod = vi.fn();

    render(
      <PaymentRequestForm
        request={request}
        busy={false}
        paymentMethod=""
        payerPhone=""
        transactionReference=""
        onPaymentMethod={onPaymentMethod}
        onPayerPhone={vi.fn()}
        onTransactionReference={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("01580352238")).toBeInTheDocument();
    expect(screen.getByText(/BDT\s*300\.00/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "bKash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nagad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rocket/iu })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sender mobile number")).toBeRequired();
    expect(screen.getByLabelText("Transaction ID")).toBeRequired();

    fireEvent.click(screen.getByRole("button", { name: "bKash" }));
    expect(onPaymentMethod).toHaveBeenCalledWith("BKASH");
  });
});
