import ManualAdSlider from "@/components/ads/ManualAdSlider";

export default function LoginAdPanel({ placement, audience }: { placement: string; audience: string }) {
  const isPosterLogin = ["USER_LOGIN", "CUSTOMER_LOGIN", "RETAILER_LOGIN", "DISTRIBUTOR_LOGIN"].includes(placement);

  return (
    <aside className={`flex min-w-0 flex-col border-b lg:min-h-[calc(100svh-18rem)] lg:border-b-0 ${
      isPosterLogin
        ? "gap-0 border-slate-200 bg-white p-0"
        : "justify-start gap-5 border-slate-200 bg-slate-50 p-5 sm:p-8 lg:border-r lg:p-10"
    }`}>
      {isPosterLogin ? (
        <>
          <ManualAdSlider
            placement={placement}
            fill
          />
          <div className="shrink-0 border-t border-slate-200 px-3 py-2 text-center text-[11px] leading-tight text-slate-600">
            Declaration: Verify advertisement details with the advertiser.
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#ea580c]">{audience} announcements</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Offers and updates</h2>
            <p className="mt-1 text-sm text-slate-600">Updates selected by LabourSeva staff for {audience.toLowerCase()}.</p>
          </div>
          <ManualAdSlider placement={placement} className="[&>div]:rounded-lg" />
          <div className="mt-auto space-y-2 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
            <h3 className="font-bold text-slate-800">Declaration</h3>
            <p>Advertisements are displayed for information. Please verify offer details directly with the advertiser before making a decision.</p>
            <p className="text-slate-500">Promotions shown here are managed by LabourSeva staff.</p>
          </div>
        </>
      )}
    </aside>
  );
}
