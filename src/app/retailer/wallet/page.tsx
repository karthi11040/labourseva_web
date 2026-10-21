"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  CreditCard,
  Building,
  Loader2,
  ShieldCheck,
  Zap,
  Check,
  Copy,
  TrendingUp,
  Sparkles,
  Lock,
  Download,
  Info,
} from "lucide-react";
import { getRazorpayCheckoutLogo } from "@/lib/razorpay-logo";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function RetailerWalletPage() {
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Topup modal state
  const [topupModal, setTopupModal] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [topupLoading, setTopupLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<{
    paymentId: string;
    amount: number;
    orderId?: string;
    receiptNo?: string;
    receiptUrl?: string;
  } | null>(null);
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [refundLimits, setRefundLimits] = useState({ daily: 1, weekly: 3, monthly: 10, last_24_hours: 0, last_7_days: 0, last_30_days: 0 });
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReasonType, setRefundReasonType] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundInfoOpen, setRefundInfoOpen] = useState(false);
  const [refundPopupOpen, setRefundPopupOpen] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  async function loadWallet() {
    try {
      setLoading(true);
      const res = await fetch("/api/retailer/wallet", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setWalletData(json);
      } else {
        setError(json.error || "Failed to load wallet ledger");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
    loadRefundRequests();
  }, []);

  async function loadRefundRequests() {
    try {
      const response = await fetch("/api/retailer/wallet/refunds", { cache: "no-store" });
      const json = await response.json();
      if (json.ok) {
        setRefundRequests(json.requests || []);
        setRefundLimits({
          daily: 1, weekly: 3, monthly: 10,
          last_24_hours: Number(json.limits?.last_24_hours || 0),
          last_7_days: Number(json.limits?.last_7_days || 0),
          last_30_days: Number(json.limits?.last_30_days || 0),
        });
      }
      else setError(json.error || "Could not load refund requests.");
    } catch {
      setError("Could not connect to load refund requests.");
    }
  }

  async function submitRefundRequest(e?: React.FormEvent) {
    e?.preventDefault();
    setRefundBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/retailer/wallet/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: refundAmount, reasonType: refundReasonType, reason: refundReason }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Could not submit refund request.");
      setSuccessMsg(json.message);
      setRefundAmount("");
      setRefundReasonType("");
      setRefundReason("");
      setRefundPopupOpen(false);
      await Promise.all([loadRefundRequests(), loadWallet()]);
    } catch (err: any) {
      setError(err.message || "Could not submit refund request.");
    } finally {
      setRefundBusy(false);
    }
  }

  async function handleTopupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopupLoading(true);
    setSuccessMsg(null);
    setError(null);
    setLastPaymentReceipt(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 10) {
      setError("Please enter a valid top-up amount of at least ₹10.");
      setTopupLoading(false);
      return;
    }

    try {
      // 1. Create Razorpay order on server
      const orderRes = await fetch("/api/retailer/wallet/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.ok) {
        throw new Error(orderData.error || "Unable to initiate Razorpay top-up order.");
      }

      // 2. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay checkout gateway. Please check your internet connection.");
      }

      // 3. Configure options with official logo
      const logoUrl = await getRazorpayCheckoutLogo();

      const options = {
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: "INR",
        name: "LabourSeva Kendra · Govt of TN",
        description: `Kendra Wallet Balance Top-up (₹${numAmount.toLocaleString("en-IN")})`,
        image: logoUrl,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setTopupLoading(true);
            const verifyRes = await fetch("/api/retailer/wallet/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id || orderData.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amount: numAmount,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setSuccessMsg(verifyData.message || `₹${numAmount.toFixed(2)} credited successfully to Kendra wallet.`);
            setLastPaymentReceipt({
              paymentId: response.razorpay_payment_id,
              amount: numAmount,
              orderId: response.razorpay_order_id || orderData.orderId,
              receiptNo: verifyData.receiptNo,
              receiptUrl: verifyData.receiptUrl || `/api/retailer/wallet/receipt?paymentId=${encodeURIComponent(response.razorpay_payment_id)}`,
            });
            setTopupModal(false);
            loadWallet();
          } catch (err: any) {
            setError(err.message || "Payment verification could not be completed.");
          } finally {
            setTopupLoading(false);
          }
        },
        prefill: {
          name: orderData.retailer?.name || walletData?.retailer?.shopName || "Kendra Operator",
          contact: orderData.retailer?.phone || walletData?.retailer?.phone || "",
          email: orderData.retailer?.email || "",
        },
        theme: {
          color: "#1e3a8a",
        },
        modal: {
          ondismiss: function () {
            setTopupLoading(false);
            fetch("/api/retailer/wallet/failure", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: orderData.orderId,
                isCancelled: true,
                amount: numAmount,
              }),
            }).catch(() => {}).finally(() => { void loadWallet(); });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setTopupLoading(false);
        setError(`Razorpay payment failed: ${response.error?.description || "Transaction declined by gateway."}`);
        fetch("/api/retailer/wallet/failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: response.error?.metadata?.payment_id,
            error: response.error,
            amount: numAmount,
          }),
        }).catch(() => {}).finally(() => { void loadWallet(); });
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Failed to start Razorpay payment.");
      setTopupLoading(false);
    }
  }

  if (loading && !walletData) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a] mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading Kendra Wallet & Ledger...</p>
      </div>
    );
  }

  const { walletBalance, totalCredited, distributor, transactions, retailer } = walletData || {};
  const currentBalNum = Number(walletBalance || 0);
  const refundLimitReached = refundLimits.last_24_hours >= 1 || refundLimits.last_7_days >= 3 || refundLimits.last_30_days >= 10;
  const inputAmtNum = Number(amount || 0);
  const projectedBalance = currentBalNum + (isNaN(inputAmtNum) ? 0 : inputAmtNum);

  return (
    <div className="space-y-6 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200 mb-1">
            <ShieldCheck size={12} />
            <span>Government Verified Kendra Account · {retailer?.registrationNo || "RET-DESK"}</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Kendra Wallet & Transaction Ledger
          </h1>
          <p className="text-sm leading-relaxed text-slate-500 mt-1">
            Real-time balance, instant Razorpay top-ups, and row-level ledger for all statutory citizen filings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setRefundAmount("");
              setRefundReasonType("");
              setRefundReason("");
              void loadWallet();
              setRefundPopupOpen(true);
            }}
            disabled={currentBalNum < 1 || refundLimitReached}
            className="px-4 py-2.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            Request refund
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccessMsg(null);
              setTopupModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Plus size={16} />
            <span>Top-Up Balance (Razorpay)</span>
          </button>
        </div>
      </div>

      {/* Success Alert with Receipt Details */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-950">{successMsg}</p>
              {lastPaymentReceipt && (
                <p className="text-[11px] text-emerald-700 mt-0.5 font-mono">
                  Receipt: <span className="font-bold">{lastPaymentReceipt.receiptNo || "Generated"}</span> · Payment ID: <span className="font-bold">{lastPaymentReceipt.paymentId}</span> · Credited: ₹{lastPaymentReceipt.amount.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {lastPaymentReceipt && (
              <a
                href={lastPaymentReceipt.receiptUrl || `/api/retailer/wallet/receipt?paymentId=${encodeURIComponent(lastPaymentReceipt.paymentId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Download size={13} />
                <span>Download Payment Receipt (PDF)</span>
              </a>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
              Instant Credit
            </span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Live Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Current Available Balance
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-[#1e3a8a]">
              <Wallet size={18} />
            </span>
          </div>
          <div className="text-2xl font-black tabular-nums text-slate-900 mt-2">
            ₹{currentBalNum.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <Zap size={12} className="text-amber-500" />
            <span>Instant debit on citizen certificate submissions</span>
          </p>
        </div>

        {/* Card 2: Total Credited */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Lifetime Credits
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownLeft size={18} />
            </span>
          </div>
          <div className="text-2xl font-black tabular-nums text-slate-900 mt-2">
            ₹{Number(totalCredited || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Wallet top-ups and earned Kendra commission profit
          </p>
        </div>

        {/* Card 3: Assigned Distributor */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Territory Distributor
            </span>
            <span className="p-2 rounded-lg bg-orange-50 text-[#ea580c]">
              <Building size={18} />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 truncate mt-2">
            {distributor?.name || "Direct Territory"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Contact: {distributor?.phone || "State Desk"}
          </p>
          <span className="inline-block mt-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Distributor ID: {distributor?.id || "DIRECT"}
          </span>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="font-black text-sm text-slate-900">Wallet balance refund</h2>
            <p className="text-[11px] text-slate-500 mt-1">Available balance: ₹{currentBalNum.toFixed(2)} · History includes holds from top-ups and commissions.</p>
            <p className="mt-1 text-[11px] font-medium text-slate-600">Limits: {refundLimits.last_24_hours}/1 per 24 hours · {refundLimits.last_7_days}/3 per 7 days · {refundLimits.last_30_days}/10 per 30 days</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setRefundInfoOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1e3a8a] bg-white px-3 text-sm font-semibold text-[#1e3a8a] hover:bg-blue-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#ea580c]" aria-haspopup="dialog">
              <Info size={16} /> More info
            </button>
          </div>
        </div>
        {currentBalNum < 1 && <p className="px-4 pb-4 text-xs text-slate-500">There is no available wallet balance to refund.</p>}
        {refundLimitReached && <p className="px-4 pb-4 text-xs font-medium text-amber-800">You have reached a refund request limit. You can request again when the rolling limit window allows it.</p>}
        {refundRequests.length > 0 && <div className="overflow-x-auto border-t border-slate-100"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Staff note</th></tr></thead><tbody className="divide-y divide-slate-100">{refundRequests.map((item: any) => <tr key={item.id}><td className="px-4 py-3 font-mono">RF-{item.id}</td><td className="px-4 py-3">₹{Number(item.amount).toFixed(2)}</td><td className="px-4 py-3">{item.reason}</td><td className="px-4 py-3 font-bold">{String(item.status).replaceAll("_", " ")}</td><td className="px-4 py-3">{item.staff_note || "—"}</td></tr>)}</tbody></table></div>}
      </section>

      {refundPopupOpen && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !refundBusy) setRefundPopupOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="wallet-refund-title" className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div><h2 id="wallet-refund-title" className="font-black text-lg text-slate-900">Wallet balance refund</h2><p className="mt-1 text-sm text-slate-600">Request payout from your available wallet balance, including top-ups and earned commissions. Funds are held during staff review. Limits: 1 per 24 hours, 3 per 7 days, and 10 per 30 days. You can have multiple requests in review within these limits.</p></div>
            <button type="button" disabled={refundBusy} onClick={() => setRefundPopupOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50" aria-label="Close refund request popup"><X size={18} /></button>
          </div>
          <form onSubmit={submitRefundRequest} className="grid gap-4 p-5">
            <label className="block text-sm font-semibold text-slate-700">Amount to refund (available: ₹{currentBalNum.toFixed(2)})
              <input type="number" min="1" max={currentBalNum} step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} required className="mt-1 block w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Reason
              <select value={refundReasonType} onChange={(e) => setRefundReasonType(e.target.value)} required className="mt-1 block w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select a reason</option>
                <option value="Excess wallet balance">Excess wallet balance</option>
                <option value="Account closure">Account closure</option>
                <option value="Incorrect top-up">Incorrect top-up</option>
                <option value="Services no longer needed">Services no longer needed</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">Additional details (optional)
              <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} maxLength={450} placeholder="Add details for staff, if needed" className="mt-1 block w-full min-h-11 rounded-lg border border-slate-300 px-3 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={refundBusy} onClick={() => setRefundPopupOpen(false)} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
              <button disabled={refundBusy || currentBalNum < 1 || refundLimitReached} className="min-h-11 rounded-lg bg-[#1e3a8a] px-4 text-sm font-bold text-white disabled:opacity-50">{refundBusy ? "Sending…" : "Submit refund request"}</button>
            </div>
          </form>
        </section>
      </div>}

      {refundInfoOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setRefundInfoOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="wallet-refund-info-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-300 bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-[#ea580c]">Wallet payout information</p><h2 id="wallet-refund-info-title" className="mt-1 text-xl font-black text-slate-900">Refund rules and process</h2></div>
            <button type="button" autoFocus onClick={() => setRefundInfoOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50" aria-label="Close information popup"><X size={18} /></button>
          </div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
            <section>
              <h3 className="font-bold text-slate-900">1. What can be refunded?</h3>
              <p>You may request an amount up to your <strong>available wallet balance</strong>. That pooled balance can include money added through top-ups and commissions credited to your wallet. Previously spent funds and amounts already held for another refund are not available.</p>
            </section>
            <section>
              <h3 className="font-bold text-slate-900">2. Request limits</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>At most <strong>1 request in any rolling 24-hour period</strong>.</li>
                <li>At most <strong>3 requests in any rolling 7-day period</strong>.</li>
                <li>At most <strong>10 requests in any rolling 30-day period</strong>.</li>
              </ul>
              <p className="mt-1">All submitted requests count toward these limits, including requests later rejected. More than one request may be pending if each limit is respected.</p>
            </section>
            <section>
              <h3 className="font-bold text-slate-900">3. What happens to the balance?</h3>
              <p>When you submit a request, the requested amount is immediately held by debiting it from your available wallet balance. The hold prevents those funds from being spent or requested a second time. Your original top-up and commission ledger entries remain unchanged as historical records; the hold appears as a separate wallet debit.</p>
            </section>
            <section>
              <h3 className="font-bold text-slate-900">4. Staff review and payout</h3>
              <p>Staff review the reason and amount. If rejected, the held amount is credited back to your wallet and the release is recorded in the ledger. If approved, staff arrange the payout separately and mark it paid after sending it. Marking it paid does not debit your wallet again because the funds were held when you submitted the request.</p>
            </section>
            <section>
              <h3 className="font-bold text-slate-900">5. Status meanings</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li><strong>Requested:</strong> submitted and waiting for staff review; funds are held.</li>
                <li><strong>Approved:</strong> approved for payout; funds remain held until payout is completed.</li>
                <li><strong>Paid:</strong> staff recorded that the payout was sent.</li>
                <li><strong>Rejected:</strong> request declined and held funds returned to the wallet.</li>
              </ul>
            </section>
          </div>
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Payouts are not sent automatically by this portal. Keep your verified contact and payout details current, and contact staff if an approved request has not been paid.</p>
          <div className="mt-5 flex justify-end"><button type="button" onClick={() => setRefundInfoOpen(false)} className="min-h-11 rounded-lg bg-[#1e3a8a] px-5 text-sm font-bold text-white">Got it</button></div>
        </section>
      </div>}

      {/* Transactions Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-sm text-slate-900">Historical Transaction Ledger</h2>
            <p className="text-[11px] text-slate-500">Auditable record of all wallet debits and top-ups</p>
          </div>
          <button
            type="button"
            onClick={loadWallet}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Source Category</th>
                  <th className="py-3 px-4 whitespace-nowrap">Description</th>
                  <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[130px]">Payment Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {tx.id}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.type === "credit" ? (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <ArrowDownLeft size={10} className="shrink-0" />
                          <span>Credit</span>
                        </span>
                      ) : tx.type === "debit" ? (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <ArrowUpRight size={10} className="shrink-0" />
                          <span>Debit</span>
                        </span>
                      ) : (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Payment</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                      {tx.type === "credit" ? "+" : tx.type === "debit" ? "-" : ""}₹{Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        ["SUCCESSFUL", "COMPLETED"].includes(tx.status)
                          ? "bg-emerald-100 text-emerald-800"
                          : ["FAILED", "CANCELLED", "TIMED_OUT"].includes(tx.status)
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                      }`}>
                        {String(tx.status || "UNKNOWN").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {tx.sourceType || "General"}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      <span className="truncate block" title={tx.description}>{tx.description}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "-"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {tx.receiptUrl ? (
                        <a
                          href={tx.receiptUrl || `/api/retailer/wallet/receipt?id=${tx.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-200 hover:bg-[#1e3a8a] hover:text-white transition-all shadow-2xs group"
                          title="Download Official Payment Receipt PDF"
                        >
                          <Download size={11} className="group-hover:translate-y-0.5 transition-transform" />
                          <span>Download Receipt</span>
                        </a>
                      ) : tx.type === "debit" ? (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Debit Entry
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No ledger transactions recorded yet</p>
            <p className="text-xs mt-1">Wallet deductions and funding history will appear here in real-time.</p>
          </div>
        )}
      </div>

      {/* Professional Informative Topup Modal with Official Logo and UPI */}
      {topupModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-150 my-auto">
            
            {/* Top Navy Government Stripe with Close Button */}
            <div className="bg-[#1e3a8a] text-white px-5 py-4 flex items-center justify-between border-b-4 border-[#ea580c]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white p-1.5 shadow-sm shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/Logo.png"
                    alt="Tamil Nadu Government · LabourSeva Emblem"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      தமிழ்நாடு அரசு · Official Portal
                    </span>
                    <span className="text-[9px] font-mono bg-blue-900/80 px-1.5 py-0.5 rounded border border-blue-400/30 text-blue-200">
                      {retailer?.registrationNo || "RET-KENDRA"}
                    </span>
                  </div>
                  <h2 className="text-base font-black tracking-tight text-white leading-tight">
                    Kendra Wallet Balance Top-Up
                  </h2>
                  <p className="text-[11px] text-blue-200">
                    Instant automated credit via Razorpay Payment Gateway
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={topupLoading}
                onClick={() => setTopupModal(false)}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-blue-800/60 transition-colors disabled:opacity-50"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleTopupSubmit} className="p-5 space-y-4 text-xs">
              
              {/* Operator & Kendra Badge */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Building size={14} className="text-[#1e3a8a]" />
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block leading-none">Beneficiary Counter</span>
                    <span className="font-bold text-slate-900 text-xs">{retailer?.shopName || "Kendra Assistance Counter"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-semibold block leading-none">Current Balance</span>
                  <span className="font-black text-[#1e3a8a] text-xs">₹{currentBalNum.toFixed(2)}</span>
                </div>
              </div>

              {/* Amount Selection Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    Select Top-Up Amount (₹)
                  </label>
                  <span className="text-[10px] text-slate-500">Min: ₹10 · Max: ₹5,00,000</span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-5 gap-1.5">
                  {["500", "1000", "2000", "5000", "10000"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all text-center ${
                        amount === val
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs scale-102"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ₹{Number(val).toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                {/* Amount Input with Currency Symbol */}
                <div className="relative mt-2">
                  <span className="absolute left-3.5 top-2.5 font-black text-slate-600 text-base">₹</span>
                  <input
                    type="number"
                    min="10"
                    max="500000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-28 py-2.5 rounded-xl border border-slate-300 text-base font-black text-slate-900 focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                    placeholder="Enter amount (min ₹10)"
                  />
                  <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    INR (₹)
                  </span>
                </div>
              </div>

              {/* Dynamic Balance Preview Card */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">Existing</span>
                  <span className="text-xs font-bold text-slate-700">₹{currentBalNum.toFixed(2)}</span>
                </div>
                <div className="border-x border-blue-200/60">
                  <span className="text-[10px] font-semibold text-[#ea580c] block">+ Top-Up</span>
                  <span className="text-xs font-bold text-[#ea580c]">+₹{inputAmtNum > 0 ? inputAmtNum.toFixed(2) : "0.00"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-emerald-700 block">= New Balance</span>
                  <span className="text-xs font-black text-emerald-700">₹{projectedBalance.toFixed(2)}</span>
                </div>
              </div>


              {/* Supported Payment Strip & Fee Breakdown */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-slate-600" />
                  <span className="font-semibold text-slate-700">Gateway Processing Fee:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                    ₹0.00 (Zero Surcharge / Free)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={topupLoading || inputAmtNum < 10}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                >
                  {topupLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Opening Secure Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="fill-white" />
                      <span>Pay ₹{inputAmtNum > 0 ? inputAmtNum.toLocaleString("en-IN") : "0"} Instantly via UPI / Gateway</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={topupLoading}
                  onClick={() => setTopupModal(false)}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {/* Security & Regulatory Compliance Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <Lock size={11} className="text-emerald-600" />
                  <span>RBI Authorized Payment Aggregator (Razorpay)</span>
                </div>
                <span className="font-medium text-slate-500">256-bit SSL Encrypted</span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
