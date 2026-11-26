import { uploadEaBuildAction } from "./upload-actions";

export function MentorEaUpload() {
  return <section className="surface-card p-5 sm:p-6">
    <h2 className="text-base font-semibold text-white">Upload an EA build</h2>
    <p className="mt-2 text-xs leading-5 text-slate-400">Upload source (.mq5) or compiled (.ex5) files to your private mentor folder. Maximum 10 MB. Uploading does not install or run the EA.</p>
    <form action={uploadEaBuildAction} encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs text-slate-400">EA file<input type="file" name="eaFile" accept=".mq5,.ex5" required className="field-input"/></label>
      <label className="grid gap-1.5 text-xs text-slate-400">Version tag<input name="versionTag" required maxLength={40} placeholder="1.0.0" className="field-input"/></label>
      <label className="grid gap-1.5 text-xs text-slate-400 sm:col-span-2">Release notes<textarea name="versionNotes" maxLength={500} rows={2} className="field-input" placeholder="Changes and compatibility notes"/></label>
      <button type="submit" className="min-h-10 rounded-lg bg-blue-500 px-4 text-xs font-semibold text-white sm:col-span-2">Upload private EA build</button>
    </form>
  </section>;
}
