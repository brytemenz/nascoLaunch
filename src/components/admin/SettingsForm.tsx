"use client";

import { useActionState, useState, useTransition } from "react";
import { saveSettings, sendTestMessage } from "@/actions/admin";
import { FormMessage } from "../FormMessage";
import { Icon } from "../Icon";
import { Spinner, SubmitButton } from "../SubmitButton";

type Settings = {
  companyName: string;
  restaurantName: string;
  restaurantPhone: string;
  restaurantWhatsapp: string;
  currency: string;
  sendWhatsapp: boolean;
  sendSms: boolean;
  showPrices: boolean;
  mealPrice: number;
};

export function SettingsForm({ settings, providers }: { settings: Settings; providers: { whatsapp: string | null; sms: string | null } }) {
  const [state, action] = useActionState(saveSettings, undefined);
  const [testState, setTestState] = useState<{ error?: string; success?: string }>();
  const [testing, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function test(channel: "WHATSAPP" | "SMS") {
    setBusy(channel);
    start(async () => {
      setTestState(await sendTestMessage(channel));
      setBusy(null);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form action={action} className="card space-y-8 p-6 sm:p-8 lg:col-span-2">
        <section>
          <h2 className="text-lg font-semibold">Restaurant</h2>
          <p className="text-sm text-muted">Where closed orders are sent.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="restaurantName">Restaurant name</label>
              <input id="restaurantName" name="restaurantName" className="input" defaultValue={settings.restaurantName} required />
            </div>
            <div>
              <label className="label" htmlFor="restaurantWhatsapp">WhatsApp number</label>
              <input id="restaurantWhatsapp" name="restaurantWhatsapp" className="input" defaultValue={settings.restaurantWhatsapp} placeholder="+233 24 000 0000" />
            </div>
            <div>
              <label className="label" htmlFor="restaurantPhone">SMS number</label>
              <input id="restaurantPhone" name="restaurantPhone" className="input" defaultValue={settings.restaurantPhone} placeholder="+233 24 000 0000" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Check name="sendWhatsapp" defaultChecked={settings.sendWhatsapp} label="Send on WhatsApp" icon="whatsapp" />
            <Check name="sendSms" defaultChecked={settings.sendSms} label="Send by SMS" icon="sms" />
          </div>
        </section>

        <section className="border-t border-line pt-8">
          <h2 className="text-lg font-semibold">Company</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="companyName">Company name</label>
              <input id="companyName" name="companyName" className="input" defaultValue={settings.companyName} required />
            </div>
            <div>
              <label className="label" htmlFor="currency">Currency symbol</label>
              <input id="currency" name="currency" className="input" defaultValue={settings.currency} required />
            </div>
          </div>
          <div className="mt-5">
            <label className="label" htmlFor="mealPrice">Cost per meal ({settings.currency})</label>
            <input id="mealPrice" name="mealPrice" type="number" step="0.01" min="0" className="input max-w-[200px]" defaultValue={settings.mealPrice} required />
            <p className="mt-2 text-xs text-subtle">Used for expense reports. Changing it only affects new orders.</p>
          </div>
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-elevated px-4 py-3 has-[:checked]:border-brand/40">
            <span className="flex-1">
              <span className="block text-[15px]">Show prices to staff</span>
              <span className="block text-sm text-muted">Off: staff and the restaurant message don&apos;t show prices. Admins always see costs.</span>
            </span>
            <input type="checkbox" name="showPrices" defaultChecked={settings.showPrices} className="h-5 w-5 accent-[#ff7a00]" />
          </label>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SubmitButton className="btn-primary h-12 px-7" pendingText="Saving…">Save settings</SubmitButton>
          <div className="flex-1"><FormMessage state={state} /></div>
        </div>
      </form>

      <aside className="card h-fit space-y-5 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Messaging</h2>
          <p className="text-sm text-muted">How orders reach the restaurant.</p>
        </div>
        <Status provider={providers.sms} label="SMS" />
        <Status provider={providers.whatsapp} label="WhatsApp" />
        {!providers.whatsapp && (
          <p className="text-xs leading-relaxed text-subtle">
            WhatsApp isn&apos;t connected to an API, so it&apos;s simulated. Use the <span className="text-muted">Send on WhatsApp</span> button on each round to send it from your own WhatsApp in one tap.
          </p>
        )}
        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <button className="btn-secondary" disabled={testing} onClick={() => test("WHATSAPP")}>
            {busy === "WHATSAPP" ? <Spinner /> : <Icon name="whatsapp" className="h-4 w-4" />} Send test WhatsApp
          </button>
          <button className="btn-secondary" disabled={testing} onClick={() => test("SMS")}>
            {busy === "SMS" ? <Spinner /> : <Icon name="sms" className="h-4 w-4" />} Send test SMS
          </button>
          <p className="text-xs text-subtle">Save your numbers first.</p>
        </div>
        <FormMessage state={testState} />
      </aside>
    </div>
  );
}

function Check({ name, label, defaultChecked, icon }: { name: string; label: string; defaultChecked: boolean; icon: "whatsapp" | "sms" }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-elevated px-4 py-3 has-[:checked]:border-brand/40">
      <Icon name={icon} className="h-5 w-5 text-muted" />
      <span className="flex-1 text-[15px]">{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5 accent-[#ff7a00]" />
    </label>
  );
}

function Status({ provider, label }: { provider: string | null; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px]">{label}</span>
      {provider ? <span className="chip-success">{provider}</span> : <span className="chip-muted">Simulated</span>}
    </div>
  );
}
