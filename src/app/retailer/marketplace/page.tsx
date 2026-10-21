"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  Store,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Wallet,
  X,
  Calendar,
  Tag,
  Layers,
  Eye,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { categoryNeedsExpiryDate } from "@/lib/marketplace-product-rules";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  pricePaise: string;
  stock: number;
  photos: string[];
  expiryDate: string | null;
  status: string;
  rejectionReason: string | null;
  updatedAt: string | null;
};

type ProductForm = Omit<
  Product,
  "id" | "status" | "rejectionReason" | "updatedAt" | "expiryDate"
> & { expiryDate: string };
type SubscriptionPlan = {
  id: number;
  name: string;
  billingPeriod: string;
  price: string;
  benefits: {
    listingRights: boolean;
    marketplaceVisibility: boolean;
    maxProducts: number;
    features: string[];
  };
};
type Subscription = {
  id: number;
  planId: number;
  planName: string;
  billingPeriod: string;
  status: string;
  amount: string;
  startsAt: string | null;
  expiresAt: string | null;
  paymentReference: string;
  purchasedAt: string | null;
  receiptAvailable: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  category: "",
  description: "",
  pricePaise: "",
  stock: 0,
  photos: [],
  expiryDate: "",
};
const photoUrl = (filename: string, productId?: number) =>
  `/api/retailer/marketplace/photo?file=${encodeURIComponent(
    filename
  )}&productId=${productId || ""}`;

export default function RetailerMarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [approved, setApproved] = useState(false);
  const [subscription, setSubscription] = useState<{
    active: boolean;
    expiresAt?: string;
    currentListings?: number;
    maxProducts?: number;
    listingRights?: boolean;
    marketplaceVisibility?: boolean;
    features?: string[];
  }>({ active: false });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [subscriptionHistory, setSubscriptionHistory] = useState<
    Subscription[]
  >([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<number | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"upload" | "draft" | "submit" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [plansOpen, setPlansOpen] = useState(false);
  const canManageListings =
    subscription.active && subscription.listingRights === true;
  const marketplaceReady = !loading && !subscriptionLoading;
  const requiresExpiryDate = categoryNeedsExpiryDate(form.category);

  async function loadProducts() {
    try {
      const response = await fetch("/api/retailer/marketplace", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Could not load product listings.");
      setProducts(data.products || []);
      setApproved(Boolean(data.approved));
      setSubscription(data.subscription || { active: false });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load product listings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadSubscriptions() {
    try {
      const response = await fetch(
        "/api/retailer/marketplace/subscription",
        { cache: "no-store" }
      );
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Could not load subscription options.");
      setPlans(data.plans || []);
      setSubscriptionHistory(data.subscriptions || []);
      setWalletBalance(Number(data.walletBalance || 0));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load subscription options."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  async function loadCheckoutScript() {
    if (window.Razorpay) return true;
    return await new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function recordSubscriptionOutcome(
    orderId: string,
    extra: Record<string, unknown> = {}
  ) {
    try {
      await fetch("/api/retailer/marketplace/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FAILURE",
          razorpayOrderId: orderId,
          ...extra,
        }),
      });
    } finally {
      await loadSubscriptions();
    }
  }

  async function purchasePlan(
    plan: SubscriptionPlan,
    paymentMethod: "WALLET" | "RAZORPAY"
  ) {
    setBuyingPlan(plan.id);
    setError("");
    setMessage("");
    if (paymentMethod === "WALLET") {
      try {
        const response = await fetch(
          "/api/retailer/marketplace/subscription",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "WALLET_PURCHASE",
              planId: plan.id,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(
            data.error || "Could not purchase this plan from your wallet."
          );
        setMessage(data.message || "Wallet payment complete.");
        await Promise.all([loadSubscriptions(), loadProducts()]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not purchase this plan from your wallet."
        );
      } finally {
        setBuyingPlan(null);
      }
      return;
    }
    let orderId = "";
    try {
      const orderResponse = await fetch(
        "/api/retailer/marketplace/subscription",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ORDER", planId: plan.id }),
        }
      );
      const order = await orderResponse.json();
      if (!orderResponse.ok || !order.ok)
        throw new Error(order.error || "Could not start subscription payment.");
      orderId = order.orderId;
      if (!(await loadCheckoutScript()) || !window.Razorpay)
        throw new Error("Could not load the Razorpay checkout.");
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency || "INR",
        name: "LabourSeva Marketplace",
        description: `${plan.name} subscription`,
        order_id: order.orderId,
        theme: { color: "#1e3a8a" },
        modal: {
          ondismiss: () => {
            void recordSubscriptionOutcome(order.orderId, {
              isCancelled: true,
            });
            setBuyingPlan(null);
          },
        },
        handler: async (payment: any) => {
          try {
            const response = await fetch(
              "/api/retailer/marketplace/subscription",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "VERIFY",
                  razorpayOrderId:
                    payment.razorpay_order_id || order.orderId,
                  razorpayPaymentId: payment.razorpay_payment_id,
                  razorpaySignature: payment.razorpay_signature,
                }),
              }
            );
            const data = await response.json();
            if (!response.ok || !data.ok)
              throw new Error(
                data.error || "Payment could not be verified."
              );
            setMessage(data.message || "Subscription activated.");
            await Promise.all([loadSubscriptions(), loadProducts()]);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Payment could not be verified."
            );
          } finally {
            setBuyingPlan(null);
          }
        },
      });
      checkout.on("payment.failed", (payment: any) => {
        setError(
          payment.error?.description || "Subscription payment failed."
        );
        void recordSubscriptionOutcome(order.orderId, {
          errorCode: payment.error?.code,
          errorDescription: payment.error?.description,
        });
        setBuyingPlan(null);
      });
      checkout.open();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start subscription payment.";
      setError(message);
      if (orderId)
        void recordSubscriptionOutcome(orderId, {
          errorCode: "CHECKOUT_UNAVAILABLE",
          errorDescription: message,
        });
      setBuyingPlan(null);
    }
  }

  async function cancelSubscription() {
    if (
      !window.confirm(
        "Cancel this subscription now? Marketplace visibility will stop immediately."
      )
    )
      return;
    try {
      const response = await fetch(
        "/api/retailer/marketplace/subscription",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CANCEL" }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Could not cancel this subscription.");
      setMessage(data.message);
      await Promise.all([loadSubscriptions(), loadProducts()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not cancel this subscription."
      );
    }
  }

  function editProduct(product: Product) {
    setSelected(product);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      pricePaise: (Number(product.pricePaise) / 100).toFixed(2),
      stock: product.stock,
      photos: product.photos,
      expiryDate: product.expiryDate || "",
    });
    setMessage("");
    setError("");
  }

  function startNew() {
    setSelected(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (!selected) {
      setError("Save a product draft before adding photos.");
      return;
    }
    if (files.length + form.photos.length > 5) {
      setError("You can add up to five photos to a product.");
      return;
    }
    setBusy("upload");
    setError("");
    let uploaded = [...form.photos];
    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        body.set("productId", String(selected.id));
        const response = await fetch("/api/retailer/marketplace/photo", {
          method: "POST",
          body,
        });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || "Could not upload a product photo.");
        uploaded = data.photos;
      }
      setForm((current) => ({ ...current, photos: uploaded }));
      setMessage("Product photos uploaded.");
    } catch (err) {
      setForm((current) => ({ ...current, photos: uploaded }));
      setError(
        err instanceof Error ? err.message : "Could not upload product photos."
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveProduct(submit: boolean) {
    if (selected?.status === "PENDING") return;
    setBusy(submit ? "submit" : "draft");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/retailer/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.pricePaise,
          productId: selected?.id ?? null,
          submit,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Could not save this product.");
      setMessage(data.message);
      setSelected(data.product);
      setProducts((current) => [
        data.product,
        ...current.filter((item) => item.id !== data.productId),
      ]);
      setForm({ ...form, photos: data.product.photos });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this product."
      );
    } finally {
      setBusy(null);
    }
  }

  const readOnly = selected?.status === "PENDING";
  const requiresExpiry = categoryNeedsExpiryDate(form.category);

  const statusConfig: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    APPROVED: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      label: "Approved",
    },
    PENDING: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      label: "Pending",
    },
    REJECTED: {
      bg: "bg-rose-50 border-rose-200",
      text: "text-rose-700",
      label: "Rejected",
    },
    DRAFT: {
      bg: "bg-slate-100 border-slate-200",
      text: "text-slate-600",
      label: "Draft",
    },
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ───────── Header ───────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center shrink-0">
            <Store size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Retailer marketplace
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              {canManageListings ? "Your listings" : "Marketplace subscription"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {canManageListings
                ? "Manage products included with your active plan. Product submissions are checked before customers can see them."
                : "Choose a plan to unlock product listings. Your plan controls how many products you can submit and which marketplace features are available."}
            </p>
          </div>
        </div>
        {canManageListings && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors shrink-0"
          >
            <Plus size={15} />
            New product
          </button>
        )}
      </div>

      {/* ───────── Loading state ───────── */}
      {!marketplaceReady ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto mb-2" />
          <p className="text-xs text-slate-500">
            Checking your subscription and listings…
          </p>
        </div>
      ) : (
        <>
          {/* ───────── Subscription status banner ───────── */}
          {canManageListings && (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900">
                  Subscription active
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {subscription.currentListings || 0}/
                  {subscription.maxProducts} live or pending listings · Expires{" "}
                  {subscription.expiresAt
                    ? new Date(subscription.expiresAt).toLocaleDateString(
                        "en-IN"
                      )
                    : "—"}
                  {subscription.marketplaceVisibility === false && (
                    <span className="block text-amber-700 mt-0.5">
                      Your products can be managed, but this plan does not
                      grant public marketplace visibility.
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlansOpen((p) => !p)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
              >
                Manage plan
                <ChevronRight
                  size={13}
                  className={plansOpen ? "rotate-90" : ""}
                />
              </button>
            </div>
          )}

          {/* ───────── Subscription Plans ───────── */}
          {(plansOpen || !canManageListings) && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {canManageListings
                      ? "Renew or change your plan"
                      : "Choose a marketplace plan"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                    Plans set your listing limit and marketplace features. A
                    retailer account must be approved before checkout.
                  </p>
                </div>
                {subscription.active && (
                  <button
                    type="button"
                    onClick={() => void cancelSubscription()}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <X size={13} />
                    Cancel subscription
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4">
                {!approved && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-2.5">
                    <AlertCircle
                      size={16}
                      className="text-amber-600 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        Account approval required.
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Complete your retailer profile and wait for staff
                        approval. You can review plans now; purchasing becomes
                        available once approved.
                      </p>
                    </div>
                  </div>
                )}

                {subscription.active && !subscription.listingRights && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
                    Your current plan is active but does not include product
                    listing rights. Choose a plan that includes listing rights
                    to manage marketplace listings.
                  </div>
                )}

                {!subscription.active && approved && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="text-xs font-bold text-slate-700 mb-2">
                      How to start selling
                    </p>
                    <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                      <li>Choose a plan and complete payment.</li>
                      <li>
                        After activation, add products within your plan's listing
                        limit.
                      </li>
                      <li>
                        Add at least one product photo and submit each product
                        for staff review.
                      </li>
                      <li>
                        Approved products appear to customers while your
                        subscription grants marketplace visibility.
                      </li>
                    </ol>
                  </div>
                )}

                {subscriptionLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      Loading subscription plans…
                    </p>
                  </div>
                ) : plans.length ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                      <span>
                        Wallet available:{" "}
                        <strong className="text-slate-900 tabular-nums">
                          ₹{walletBalance.toFixed(2)}
                        </strong>
                      </span>
                      <a
                        href="/retailer/wallet"
                        className="font-semibold text-slate-700 hover:text-slate-900 underline"
                      >
                        Top up wallet →
                      </a>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {plans.map((plan) => {
                        const price = Number(plan.price);
                        const canPayFromWallet = walletBalance >= price;
                        return (
                          <article
                            key={plan.id}
                            className="flex flex-col rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-4"
                          >
                            <div className="flex-1">
                              <h3 className="text-sm font-bold text-slate-900">
                                {plan.name}
                              </h3>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                                  ₹{plan.price}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500">
                                  /{" "}
                                  {plan.billingPeriod
                                    .toLowerCase()
                                    .replace("_", " ")}
                                </span>
                              </div>

                              <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <Layers
                                    size={11}
                                    className="text-slate-400 shrink-0"
                                  />
                                  Up to {plan.benefits.maxProducts} listings
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {plan.benefits.listingRights ? (
                                    <CheckCircle2
                                      size={11}
                                      className="text-emerald-500 shrink-0"
                                    />
                                  ) : (
                                    <X
                                      size={11}
                                      className="text-slate-400 shrink-0"
                                    />
                                  )}
                                  {plan.benefits.listingRights
                                    ? "Product submissions enabled"
                                    : "No product listing rights"}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {plan.benefits.marketplaceVisibility ? (
                                    <CheckCircle2
                                      size={11}
                                      className="text-emerald-500 shrink-0"
                                    />
                                  ) : (
                                    <X
                                      size={11}
                                      className="text-slate-400 shrink-0"
                                    />
                                  )}
                                  {plan.benefits.marketplaceVisibility
                                    ? "Marketplace visibility included"
                                    : "No public product visibility"}
                                </div>
                              </div>

                              {(plan.benefits.features || []).length > 0 && (
                                <ul className="mt-3 space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                                  {(plan.benefits.features || []).map(
                                    (feature, index) => (
                                      <li
                                        key={`${plan.id}-${index}`}
                                        className="flex items-start gap-1.5"
                                      >
                                        <CheckCircle2
                                          size={11}
                                          className="text-emerald-500 shrink-0 mt-0.5"
                                        />
                                        {feature}
                                      </li>
                                    )
                                  )}
                                </ul>
                              )}
                            </div>

                            <div className="mt-4 grid gap-2">
                              <button
                                type="button"
                                disabled={
                                  !approved ||
                                  buyingPlan !== null ||
                                  !canPayFromWallet
                                }
                                onClick={() => void purchasePlan(plan, "WALLET")}
                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {buyingPlan === plan.id ? (
                                  <>
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                    Processing…
                                  </>
                                  ) : !approved ? (
                                    "Approval required"
                                  ) : !canPayFromWallet ? (
                                    "Insufficient balance"
                                  ) : (
                                    <>
                                      <Wallet size={13} />
                                      Pay from wallet · ₹{plan.price}
                                    </>
                                  )}
                              </button>
                              <button
                                type="button"
                                disabled={!approved || buyingPlan !== null}
                                onClick={() =>
                                  void purchasePlan(plan, "RAZORPAY")
                                }
                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-3 text-[11px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {buyingPlan === plan.id ? (
                                  <>
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                    Starting checkout…
                                  </>
                                ) : !approved ? (
                                  "Approval required"
                                ) : (
                                  <>
                                    <CreditCard size={13} />
                                    Pay with Razorpay · ₹{plan.price}
                                  </>
                                )}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 text-center">
                    No active plans are available. Contact the administrator.
                  </p>
                )}

                {subscriptionHistory.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {}}
                      className="text-xs font-bold text-slate-700 mb-3"
                    >
                      Subscription history ({subscriptionHistory.length})
                    </button>
                    <div className="divide-y divide-slate-100">
                      {subscriptionHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap justify-between gap-2 py-2.5 text-xs"
                        >
                          <span className="text-slate-700">
                            <strong>{item.planName}</strong> · ₹{item.amount}
                          </span>
                          <span className="text-slate-500">
                            <strong className="text-slate-700">
                              {item.status}
                            </strong>
                            {item.startsAt &&
                              ` · starts ${new Date(
                                item.startsAt
                              ).toLocaleDateString("en-IN")}`}
                            {item.expiresAt &&
                              ` · until ${new Date(
                                item.expiresAt
                              ).toLocaleDateString("en-IN")}`}
                          </span>
                          {item.receiptAvailable && (
                            <a
                              href={`/api/retailer/marketplace/subscription?receipt=${item.id}`}
                              className="font-bold text-blue-700 underline underline-offset-2"
                            >
                              Download receipt
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────── Alerts ───────── */}
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 flex items-start gap-2.5"
            >
              <AlertCircle
                size={16}
                className="text-rose-600 shrink-0 mt-0.5"
              />
              <p className="text-xs text-rose-800">{error}</p>
            </div>
          )}
          {message && (
            <div
              role="status"
              className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-2.5"
            >
              <CheckCircle2
                size={16}
                className="text-emerald-600 shrink-0 mt-0.5"
              />
              <p className="text-xs text-emerald-800">{message}</p>
            </div>
          )}

          {/* ───────── Listings + Form (two-column) ───────── */}
          {marketplaceReady && canManageListings && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
              {/* Listings panel */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Package size={15} className="text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Your listings
                  </h2>
                  <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
                    {products.length} products
                  </span>
                </div>
                {loading ? (
                  <div className="p-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      Loading listings…
                    </p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="h-12 w-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <Package size={20} />
                    </div>
                    <p className="text-sm text-slate-700 font-semibold">
                      No products yet
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add your first product to get started.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {products.map((product) => {
                      const sc =
                        statusConfig[product.status] || statusConfig.DRAFT;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => editProduct(product)}
                          className={`flex w-full items-center gap-3 p-3.5 text-left hover:bg-slate-50 transition-colors ${
                            selected?.id === product.id
                              ? "bg-slate-50 border-l-2 border-l-[#ea580c]"
                              : ""
                          }`}
                        >
                          {product.photos[0] ? (
                            <img
                              src={photoUrl(product.photos[0], product.id)}
                              alt=""
                              className="h-12 w-12 rounded-lg border border-slate-200 object-cover shrink-0"
                            />
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400 shrink-0">
                              <Package size={18} />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {product.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Tag size={10} />
                                {product.category}
                              </span>
                              <span>·</span>
                              <span className="font-mono">
                                ₹
                                {(Number(product.pricePaise) / 100).toFixed(2)}
                              </span>
                              <span>·</span>
                              <span>Stock {product.stock}</span>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}
                          >
                            {sc.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Product form panel */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    {selected ? "Edit product" : "New product"}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Saving edits hides an approved listing until staff reviews
                    it again.
                  </p>
                </div>

                <fieldset
                  disabled={!approved || readOnly || busy !== null}
                  className="space-y-4 p-5 flex-1 disabled:opacity-70"
                >
                  {readOnly && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
                      This listing is waiting for staff review. You can edit it
                      after a decision.
                    </div>
                  )}
                  {selected?.status === "REJECTED" &&
                    selected.rejectionReason && (
                      <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">
                        <strong>Staff feedback:</strong>{" "}
                        {selected.rejectionReason}
                      </div>
                    )}

                  <Field
                    label="Product name"
                    icon={Tag}
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    maxLength={120}
                    placeholder="e.g. Cotton saree"
                    required
                  />

                  <Field
                    label="Category"
                    icon={Layers}
                    value={form.category}
                    onChange={(v) => setForm({ ...form, category: v })}
                    maxLength={80}
                    placeholder="e.g. Clothing, groceries, tools"
                  />

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      maxLength={5000}
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Describe the product, material, dimensions, etc."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        Expiry date
                        {requiresExpiryDate ? (
                          <span className="text-rose-500">*</span>
                        ) : null}
                      </span>
                    </label>
                    <input
                      type="date"
                      required={requiresExpiryDate}
                      value={form.expiryDate}
                      onChange={(e) =>
                        setForm({ ...form, expiryDate: e.target.value })
                      }
                      className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 pl-1">
                      {requiresExpiryDate
                        ? "Required for this product category before submitting for review."
                        : "Optional for products that have an expiry or best-before date."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Price (₹)"
                      icon={CreditCard}
                      inputMode="decimal"
                      value={form.pricePaise}
                      onChange={(v) => setForm({ ...form, pricePaise: v })}
                      placeholder="0.00"
                    />
                    <Field
                      label="Stock"
                      icon={Package}
                      type="number"
                      value={String(form.stock)}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          stock: Number(v) || 0,
                        })
                      }
                      min={0}
                      max={1000000}
                    />
                  </div>

                  {/* Photo uploader */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Product photos
                      </label>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {form.photos.length} / 5
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.photos.map((photo) => (
                        <div
                          key={photo}
                          className="relative group"
                        >
                          <img
                            src={photoUrl(photo, selected?.id)}
                            alt="Product preview"
                            className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                photos: form.photos.filter(
                                  (item) => item !== photo
                                ),
                              })
                            }
                            className="absolute -right-1.5 -top-1.5 rounded-full bg-white border border-slate-200 p-1 text-rose-600 hover:bg-rose-50 hover:border-rose-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove photo"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                      {form.photos.length < 5 && (
                        <label
                          className={`flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-dashed text-slate-500 transition-colors ${
                            selected &&
                            !readOnly &&
                            selected.photos.length <= form.photos.length
                              ? "border-slate-300 hover:border-slate-900 hover:bg-slate-50 cursor-pointer"
                              : "border-slate-200 cursor-not-allowed opacity-50"
                          }`}
                        >
                          <ImagePlus size={18} />
                          <span className="mt-1 text-[9px] font-medium">
                            Add photo
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            disabled={
                              !selected ||
                              readOnly ||
                              busy !== null ||
                              selected.photos.length > form.photos.length
                            }
                            className="sr-only"
                            onChange={uploadPhotos}
                          />
                        </label>
                      )}
                    </div>
                    {!selected && (
                      <p className="mt-2 text-[10px] text-slate-400">
                        Save a draft before uploading product photos.
                      </p>
                    )}
                  </div>
                </fieldset>

                {/* Footer actions */}
                <div className="border-t border-slate-100 p-4 flex flex-wrap items-center justify-end gap-2">
                  {busy === "upload" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mr-auto">
                      <Upload size={12} className="animate-pulse" />
                      Uploading…
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!approved || busy !== null || readOnly}
                    onClick={() => void saveProduct(false)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={13} />
                    {busy === "draft" ? "Saving…" : "Save draft"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      !approved ||
                      !subscription.active ||
                      !subscription.listingRights ||
                      busy !== null ||
                      readOnly ||
                      form.photos.length === 0
                    }
                    onClick={() => void saveProduct(true)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-3.5 text-[11px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {busy === "submit" ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        Submit for review
                      </>
                    )}
                  </button>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ────────────────── Reusable Field ────────────────── */
function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  maxLength,
  min,
  max,
  inputMode,
}: {
  label: string;
  icon: any;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email" | "url";
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={12} className="text-slate-400" />
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        min={min}
        max={max}
        inputMode={inputMode}
        className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all"
      />
    </div>
  );
}
