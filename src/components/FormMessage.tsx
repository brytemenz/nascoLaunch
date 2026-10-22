export function FormMessage({ state }: { state?: { error?: string; success?: string } }) {
  if (!state?.error && !state?.success) return null;
  const error = !!state.error;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`animate-fade rounded-xl2 px-4 py-3 text-sm border ${
        error ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}
