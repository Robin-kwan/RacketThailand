"use client";

type VisibilityCopy = {
  label: string;
  hint: string;
  publicLabel: string;
  publicDescription: string;
  privateLabel: string;
  privateDescription: string;
};

type GroupVisibilityToggleProps = {
  isPublic: boolean;
  onChange: (value: boolean) => void;
  copy: VisibilityCopy;
};

function getButtonClasses(active: boolean) {
  const base =
    "rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300";
  if (active) {
    return `${base} border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20`;
  }
  return `${base} border-transparent bg-transparent text-slate-500 hover:bg-white hover:text-slate-800`;
}

export function GroupVisibilityToggle({
  isPublic,
  onChange,
  copy,
}: GroupVisibilityToggleProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">
        {copy.label}
      </label>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          className={getButtonClasses(isPublic)}
          onClick={() => onChange(true)}
          aria-pressed={isPublic}
        >
          {copy.publicLabel}
        </button>
        <button
          type="button"
          className={getButtonClasses(!isPublic)}
          onClick={() => onChange(false)}
          aria-pressed={!isPublic}
        >
          {copy.privateLabel}
        </button>
      </div>
      <p className="text-xs font-semibold text-slate-500">
        {isPublic ? copy.publicDescription : copy.privateDescription}
      </p>
      <p className="text-xs text-slate-500">{copy.hint}</p>
    </div>
  );
}
