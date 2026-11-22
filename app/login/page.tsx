import Link from "next/link";
import { signInAction } from "@/app/auth-actions";
import { Command, ShieldCheck } from "lucide-react";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="auth-wrap">
    <section className="auth-card">
      <Link href="/" className="auth-brand"><span className="brand-mark"><Command size={21}/></span><span><strong>EA Trade</strong><small>MOBILE VPS CONSOLE</small></span></Link>
      <p className="eyebrow mt-9">WELCOME BACK</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your workspace</h1><p className="mt-2 text-sm leading-6 text-slate-400">Access your hosted robots, licenses and system activity.</p>
      {params.error && <p role="alert" className="auth-alert">{params.error}</p>}
      {params.message && <p role="status" className="auth-success">{params.message}</p>}
      <form action={signInAction} className="mt-7 space-y-4">
        <label className="auth-label">Email address<input className="auth-input" name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></label>
        <label className="auth-label">Password<input className="auth-input" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required/></label>
        <button className="auth-submit" type="submit">Sign in</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">New to EA Trade? <Link href="/register" className="font-semibold text-blue-300 hover:text-blue-200">Create an account</Link></p>
      <div className="auth-security"><ShieldCheck size={15}/> Protected sign-in · Supabase authentication</div>
    </section>
  </main>;
}
