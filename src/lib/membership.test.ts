import { describe, expect, it } from "vitest";
import { membershipClientSchema } from "./membership";

const application = {
  membershipTypeKey: "CLUB_MEMBER",
  fullName: "Payment Applicant",
  phone: "+8801712345678",
  studentId: "2022331001",
  department: "CSE",
  batch: "22",
  skills: ["IoT"],
  interests: ["Automation"],
  motivation: "I want to contribute to practical club projects and workshops.",
  timeCommitment: "5-8 hours/week" as const,
  declarationAccepted: true as const,
};

describe("membership application payment validation", () => {
  it("accepts bKash or Nagad evidence attached to the application", () => {
    const result = membershipClientSchema.safeParse({
      ...application,
      payment: {
        paymentMethod: "BKASH",
        payerPhone: "01712345678",
        transactionReference: "TXN-APPLICATION-0001",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unsupported channels and invalid sender numbers", () => {
    const result = membershipClientSchema.safeParse({
      ...application,
      payment: {
        paymentMethod: "ROCKET",
        payerPhone: "12345",
        transactionReference: "TXN-APPLICATION-0002",
      },
    });
    expect(result.success).toBe(false);
  });
});
