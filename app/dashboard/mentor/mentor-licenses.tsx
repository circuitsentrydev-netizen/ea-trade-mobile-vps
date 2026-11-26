"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Plus, ShieldOff } from "lucide-react";
import { createHostRobotKey, revokeHostRobotKey } from "./license-actions";

type License = { id: string; key_hint: string; max_accounts: number; client_id: string | null; status: string; expires_at: string | null; created_at: string };

export function MentorLicenses({ licenses }: { licenses: License[] }) {
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState("");
  const [maxAccounts, setMaxAccounts] = useState("1");
  const [pending, startTransition] = useTransition();
  function create() {
    setError("");
    startTransition(async () => {
      const result = await createHostRobotKey({ maxAccounts: Number(maxAccounts) });
      if (result.error) setError(result.error);
      else setNewKey(result.key ?? "");
    });
  }
  function revoke(id: string) {
    if (!window.confirm("Revoke this HOST ROBOT KEY? Connected accounts will no longer pass future licence checks.")) return;
    startTransition(async () => {
      const result = await revokeHostRobotKey(id);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  }
  return <section className="surface-card p-5 sm:p-6">
    <div className="flex items-center gap-2"><KeyRound size={18} className="text-blue-300"/><h2 className="text-base font-semibold text-white">HOST ROBOT KEYs</h2></div>
    <p className="mt-2 text-xs leading-5 text-slate-400">Issue a key to a client. The full key is shown only once; the platform stores only its SHA-256 hash.</p>
    <div className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-xs text-slate-400">Maximum accounts<select value={maxAccounts} onChange={e=>setMaxAccounts(e.target.value)} className="field-input"><option value="1">1 account</option><option value="2">2 accounts</option><option value="3">3 accounts</option><option value="5">5 accounts</option></select></label><button type="button" disabled={pending} onClick={create} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-500 px-4 text-xs font-semibold text-white disabled:opacity-50"><Plus size={14}/> Generate key</button></div>
    {newKey && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3"><p className="text-[11px] font-semibold text-amber-200">Copy this key and send it to your client. It cannot be recovered later.</p><code className="mt-2 block text-base font-bold tracking-wider text-white">{newKey}</code><button type="button" onClick={()=>navigator.clipboard.writeText(newKey)} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><Copy size={13}/> Copy key</button></div>}
    {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    <div className="mt-5 grid gap-2">{licenses.map(item=><article key={item.id} className="rounded-xl border border-white/[0.07] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">SMC-••••-{item.key_hint}</p><p className="mt-1 text-[11px] text-slate-400">{item.max_accounts} account(s) · {item.client_id ? "Assigned" : "Unassigned"} · {item.status}</p>{item.expires_at && <p className="mt-1 text-[11px] text-slate-500">Expires {new Date(item.expires_at).toLocaleDateString()}</p>}</div>{item.status === "ACTIVE" && <button type="button" disabled={pending} onClick={()=>revoke(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-300"><ShieldOff size={13}/> Revoke</button>}</div></article>)}</div>
    {!licenses.length && <p className="mt-4 text-xs text-slate-500">No HOST ROBOT KEYs created yet.</p>}
  </section>;
}
