import { useRef } from "react";
import { Download, CheckCircle, Clock } from "lucide-react";

interface PaymentSlipProps {
  type: "event" | "course" | "membership";
  title: string;
  name: string;
  email: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: "pending" | "confirmed" | "unpaid";
  date: string;
  registrationId?: string;
}

const PaymentSlip = ({ type, title, name, email, amount, paymentMethod, transactionId, status, date, registrationId }: PaymentSlipProps) => {
  const slipRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!slipRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Payment Slip - ${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; color: #1a1a2e; }
        .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 20px; color: #6366f1; margin: 0 0 4px; }
        .header p { font-size: 12px; color: #666; margin: 0; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 12px 0; }
        .status.confirmed { background: #dcfce7; color: #166534; }
        .status.pending { background: #fef9c3; color: #854d0e; }
        .status.unpaid { background: #fee2e2; color: #991b1b; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .row .label { color: #666; }
        .row .value { font-weight: 600; }
        .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header">
        <h1>RUET IoT Club</h1>
        <p>Payment ${status === "unpaid" ? "Voucher (Unpaid)" : status === "pending" ? "Receipt (Pending Verification)" : "Receipt (Confirmed)"}</p>
      </div>
      <div style="text-align:center">
        <span class="status ${status}">${status === "unpaid" ? "⏳ UNPAID" : status === "pending" ? "⏳ PENDING VERIFICATION" : "✅ PAYMENT CONFIRMED"}</span>
      </div>
      <div class="row"><span class="label">Type</span><span class="value">${type.charAt(0).toUpperCase() + type.slice(1)} Registration</span></div>
      <div class="row"><span class="label">${type === "event" ? "Event" : type === "course" ? "Course" : "Membership"}</span><span class="value">${title}</span></div>
      <div class="row"><span class="label">Name</span><span class="value">${name}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${email}</span></div>
      <div class="row"><span class="label">Amount</span><span class="value">৳${amount}</span></div>
      <div class="row"><span class="label">Payment Method</span><span class="value">${paymentMethod}</span></div>
      <div class="row"><span class="label">Transaction ID</span><span class="value">${transactionId || "N/A"}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${new Date(date).toLocaleString()}</span></div>
      ${registrationId ? `<div class="row"><span class="label">Ref ID</span><span class="value">${registrationId.slice(0, 8).toUpperCase()}</span></div>` : ""}
      <div class="footer">
        <p>This is a computer-generated document. No signature required.</p>
        <p>RUET IoT Club — Rajshahi University of Engineering & Technology</p>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div ref={slipRef} className="p-4 rounded-xl glass border border-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Payment Slip</h4>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            status === "confirmed" ? "bg-green-500/10 text-green-400" :
            status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
            "bg-red-500/10 text-red-400"
          }`}>
            {status === "confirmed" ? <CheckCircle size={10} /> : <Clock size={10} />}
            {status === "unpaid" ? "Unpaid" : status === "pending" ? "Pending" : "Confirmed"}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Type:</span><span className="text-foreground font-medium">{type}</span></div>
        <div className="flex justify-between"><span>Amount:</span><span className="text-foreground font-medium">৳{amount}</span></div>
        <div className="flex justify-between"><span>Method:</span><span className="text-foreground font-medium">{paymentMethod}</span></div>
        {transactionId && <div className="flex justify-between"><span>TXN ID:</span><span className="text-foreground font-medium">{transactionId}</span></div>}
      </div>
      <button onClick={handleDownload} className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
        <Download size={12} /> Download Slip
      </button>
    </div>
  );
};

export default PaymentSlip;
