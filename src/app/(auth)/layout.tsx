import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between p-12 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(40rem_30rem_at_20%_110%,rgb(255_122_0/0.35),transparent_70%)]" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-brand/20 blur-[120px]" />
        <div className="relative"><Logo /></div>
        <div className="relative max-w-md animate-rise">
          <p className="eyebrow mb-5">Office lunch, simplified</p>
          <h1 className="text-6xl font-semibold leading-[1.02] tracking-[-0.04em]">
            Lunch,<br />
            <span className="text-gradient">beautifully</span><br />
            ordered.
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed">
            Pick your meal before the cut-off. We gather everyone&apos;s order and send it straight to the restaurant on WhatsApp and SMS.
          </p>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 lg:hidden"><Logo /></div>
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </section>
    </main>
  );
}
