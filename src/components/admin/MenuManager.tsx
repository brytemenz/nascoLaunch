"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteMenuItem, saveMenuItem, toggleMenuItem } from "@/actions/admin";
import { parseDays, WEEKDAYS } from "@/lib/format";
import { FormMessage } from "../FormMessage";
import { Icon } from "../Icon";
import { SubmitButton } from "../SubmitButton";
import { Sheet } from "./Sheet";
import { useConfirm } from "../Confirm";

type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  emoji: string | null;
  days: string;
  imageUrl: string | null;
  available: boolean;
};

const EMOJI = ["🍛", "🍚", "🍙", "🌽", "🍗", "🍖", "🐟", "🥗", "🍝", "🍜", "🍲", "🥘", "🌯", "🍔", "🍕", "🥤", "🧃", "🍌"];

const WORKDAYS = WEEKDAYS.slice(0, 5);

export function MenuManager({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [newForDay, setNewForDay] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const categories = [...new Set(items.map((i) => i.category))];

  // Weekdays first; weekend only if something is served then; untagged dishes last.
  const usedWeekend = WEEKDAYS.slice(5).filter((d) => items.some((i) => parseDays(i.days).includes(d.code)));
  const sections = [
    ...[...WORKDAYS, ...usedWeekend].map((d) => ({
      key: d.code,
      title: `${d.label}`,
      items: items.filter((i) => parseDays(i.days).includes(d.code)),
    })),
    { key: "ALL", title: "Every day", items: items.filter((i) => parseDays(i.days).length === 0) },
  ];

  function add(day: string | null) {
    setNewForDay(day);
    setEditing("new");
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Menu</p>
          <h1 className="page-title mt-3">Weekly menu</h1>
          <p className="mt-3 text-muted">Each day shows only the dishes tagged for it. Untagged dishes are served every day.</p>
        </div>
        <button className="btn-primary" onClick={() => add(null)}>
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} /> Add dish
        </button>
      </div>

      {sections.map((section) =>
        section.key === "ALL" && section.items.length === 0 ? null : (
          <section key={section.key} className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-subtle">{section.title}</h2>
              {section.key !== "ALL" && (
                <button onClick={() => add(section.key)} className="text-sm text-brand-light hover:text-brand cursor-pointer">
                  + Add to {section.title}
                </button>
              )}
            </div>
            <div className="card overflow-hidden">
              {section.items.length === 0 && <p className="px-5 py-4 text-sm text-subtle">No dishes yet.</p>}
              {section.items.map((item, idx) => (
                <div key={item.id} className={`flex items-center gap-4 px-5 py-4 ${idx > 0 ? "border-t border-line" : ""} ${item.available ? "" : "opacity-50"}`}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-elevated text-2xl">{item.emoji || "🍲"}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="truncate text-sm text-muted">{[item.category, item.description].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Toggle checked={item.available} disabled={pending} onChange={() => start(() => toggleMenuItem(item.id))} label={`${item.name} available`} />
                  <button onClick={() => setEditing(item)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-fg cursor-pointer" aria-label={`Edit ${item.name}`}>
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ),
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New menu item" : "Edit item"}>
        {editing !== null && (
          <ItemForm
            key={editing === "new" ? "new" : editing.id}
            item={editing === "new" ? null : editing}
            categories={categories}
            defaultDay={newForDay}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  );
}

function ItemForm({
  item,
  categories,
  defaultDay,
  onDone,
}: {
  item: Item | null;
  categories: string[];
  defaultDay: string | null;
  onDone: () => void;
}) {
  const [days, setDays] = useState<string[]>(() => (item ? parseDays(item.days) : defaultDay ? [defaultDay] : []));
  const [state, action] = useActionState(saveMenuItem, undefined);
  const [emoji, setEmoji] = useState(item?.emoji ?? "🍛");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [deleting, startDelete] = useTransition();
  const confirm = useConfirm();

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-5">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="emoji" value={emoji} />

      <div>
        <label className="label" htmlFor="imageUrl">Photo link</label>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-elevated text-xl">{emoji}</div>
          )}
          <input id="imageUrl" name="imageUrl" className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… or /menu/waakye.jpg" />
        </div>
        <p className="mt-2 text-xs text-subtle">Paste a link to a photo. Without one, the icon below is shown.</p>
      </div>
      <div>
        <span className="label">Icon</span>
        <div className="flex flex-wrap gap-2">
          {EMOJI.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setEmoji(e)}
              className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition cursor-pointer ${emoji === e ? "bg-brand/20 ring-2 ring-brand" : "bg-elevated hover:bg-[#2a2a2e]"}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Served on</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.code);
            return (
              <button
                type="button"
                key={d.code}
                onClick={() => setDays((cur) => (on ? cur.filter((x) => x !== d.code) : [...cur, d.code]))}
                className={`h-9 rounded-full px-3.5 text-sm font-medium transition cursor-pointer ${on ? "bg-brand text-black" : "bg-elevated text-muted hover:text-fg"}`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        {days.map((d) => <input key={d} type="hidden" name="days" value={d} />)}
        <p className="mt-2 text-xs text-subtle">{days.length === 0 ? "No days picked — served every day." : ""}</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" className="input" defaultValue={item?.name} placeholder="Jollof rice with chicken" required />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} className="input" defaultValue={item?.description ?? ""} placeholder="Smoky party jollof, grilled chicken, coleslaw" />
      </div>
      <div>
        <div>
          <label className="label" htmlFor="category">Category</label>
          <input id="category" name="category" list="categories" className="input" defaultValue={item?.category ?? "Mains"} required />
          <datalist id="categories">
            {[...new Set(["Mains", "Sides", "Drinks", ...categories])].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>
      <FormMessage state={state?.error ? state : undefined} />
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton className="btn-primary flex-1 h-12" pendingText="Saving…">{item ? "Save changes" : "Add to menu"}</SubmitButton>
        {item && (
          <button
            type="button"
            className="btn-danger h-12"
            disabled={deleting}
            onClick={async () => {
              const ok = await confirm({
                title: `Delete ${item.name}?`,
                message: "It disappears from the menu. Past orders keep their history.",
                confirmLabel: "Delete",
                tone: "danger",
              });
              if (!ok) return;
              startDelete(async () => {
                await deleteMenuItem(item.id);
                onDone();
              });
            }}
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 cursor-pointer disabled:opacity-60 ${checked ? "bg-brand" : "bg-[#39393d]"}`}
    >
      <span className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
