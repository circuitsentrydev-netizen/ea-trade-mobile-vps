"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, RefreshCw, ShieldOff } from "lucide-react";
import { revokeMentorBotToken, rotateMentorBotToken } from "./bot-token-actions";

export function MentorBotConnection() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function rotate() {
    if (token && !window.confirm("Replace the current bot token? The existing token will stop working.")) return;
    startTransition(async () => {
      const result = await rotateMentorBotToken();
      if (result.error) setMessage(result.error);
      else { setToken(result.token ?? ""); setMessage("New token created. Copy it now; it will not be shown again."); }
    });
  }
  function revoke() {
    if (!window.confirm("Revoke the current bot token? Your EA will no longer be able to publish signals.")) return;
    startTransition(async () => {
      const result = await revokeMentorBotToken();
      setToken("");
      setMessage(result.error ?? "Bot token revoked.");
    });
  }
  return <section className="surface-card p-5 sm:p-6">
    <div className="flex items-center gap-2"><KeyRound size={18} className="text-blue-300"/><h2 className="text-base font-semibold text-white">Connect your MT5 bot</h2></div>
    <p className="mt-2 text-xs leading-5 text-slate-400">Generate a private token for the separate MT5 V3 journal publisher. It reads the SMC EA's append-only Common Files journal; it does not change or control trading. Store the token securely and never share it publicly.</p>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={rotate} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-500 px-4 text-xs font-semibold text-white disabled:opacity-50"><RefreshCw size={14}/> {pending ? "Working…" : "Generate / rotate bot token"}</button><button type="button" disabled={pending} onClick={revoke} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-400/20 px-4 text-xs text-rose-300 disabled:opacity-50"><ShieldOff size={14}/> Revoke token</button></div>
    {token && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3"><p className="text-[11px] font-semibold text-amber-200">Copy this token now — it is shown only once.</p><code className="mt-2 block break-all text-xs text-slate-100">{token}</code><button type="button" onClick={() => navigator.clipboard.writeText(token)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><Copy size={13}/> Copy token</button></div>}
    {message && <p role="status" className="mt-3 text-xs text-slate-300">{message}</p>}
    <div className="mt-4 rounded-lg bg-black/20 p-3"><p className="text-[11px] font-semibold text-slate-300">Signal endpoint</p><code className="mt-1 block break-all text-[11px] text-slate-400">POST /api/mentor/signals</code><p className="mt-2 text-[11px] text-slate-500">Authorization: Bearer YOUR_BOT_TOKEN · JSON body: { events: [...] } from the V3 semicolon-delimited journal. Only SMC_EVT_QUALIFIED creates a signal; no entry, stop-loss or take-profit is inferred. Real ingestion remains disabled until an actual MT5 journal row passes checksum verification.</p></div>
  </section>;
}
