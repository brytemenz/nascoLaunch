import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/db";
import { providerFor } from "@/lib/messaging";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="animate-rise">
      <p className="eyebrow">Settings</p>
      <h1 className="page-title mt-3 mb-10">Preferences</h1>
      <SettingsForm
        settings={{
          companyName: s.companyName,
          restaurantName: s.restaurantName,
          restaurantPhone: s.restaurantPhone,
          restaurantWhatsapp: s.restaurantWhatsapp,
          currency: s.currency,
          sendWhatsapp: s.sendWhatsapp,
          sendSms: s.sendSms,
          showPrices: s.showPrices,
        }}
        providers={{ whatsapp: providerFor("WHATSAPP"), sms: providerFor("SMS") }}
      />
    </div>
  );
}
