import {
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Link2,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

type PerspectiveCardCopy = {
  title: string;
  description: string;
  steps: [string, string, string];
};

export type FeaturePerspectivesCopy = {
  title: string;
  subtitle: string;
  courtOwner: PerspectiveCardCopy;
  groupOwner: PerspectiveCardCopy;
  regularUser: PerspectiveCardCopy;
};

type FeaturePerspectivesProps = {
  copy: FeaturePerspectivesCopy;
};

function CourtOwnerIllustration() {
  return (
    <div className="relative h-40 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        <Building2 className="h-3 w-3" strokeWidth={1.8} aria-hidden />
        Court Profile
      </span>
      <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" strokeWidth={1.8} aria-hidden />
          <div className="h-2 w-24 rounded-full bg-emerald-100" />
        </div>
        <div className="mt-2 h-2 w-32 rounded-full bg-emerald-100" />
      </div>
      <div className="mt-2 flex gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700">
          <Phone className="h-3 w-3" strokeWidth={1.8} aria-hidden />
          Contact
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700">
          <Link2 className="h-3 w-3" strokeWidth={1.8} aria-hidden />
          LINE
        </span>
      </div>
      <span className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
    </div>
  );
}

function GroupOwnerIllustration() {
  return (
    <div className="relative h-40 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3">
      <div className="rounded-xl border border-cyan-200 bg-white p-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-cyan-700">
            <CalendarDays className="h-3 w-3" strokeWidth={1.8} aria-hidden />
            Weekly sessions
          </span>
          <Clock3 className="h-3.5 w-3.5 text-cyan-700" strokeWidth={1.8} aria-hidden />
        </div>
        <div className="mt-2 h-2 w-28 rounded-full bg-cyan-100" />
        <div className="mt-2 h-2 w-22 rounded-full bg-cyan-100" />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-200 bg-white p-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
          <Users className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="space-y-1">
          <div className="h-2 w-20 rounded-full bg-cyan-100" />
          <div className="h-2 w-14 rounded-full bg-cyan-100" />
        </div>
      </div>
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-white px-2 py-1 text-[10px] font-semibold text-cyan-700">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2} aria-hidden />
        Verified
      </span>
    </div>
  );
}

function RegularUserIllustration() {
  return (
    <div className="relative h-40 rounded-2xl border border-indigo-200 bg-indigo-50/65 p-3">
      <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-indigo-700" strokeWidth={1.8} aria-hidden />
        <div className="h-2 w-24 rounded-full bg-indigo-100" />
      </div>
      <div className="mt-2 space-y-2">
        <div className="rounded-lg border border-indigo-200 bg-white p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-indigo-700" strokeWidth={1.8} aria-hidden />
              <div className="h-2 w-14 rounded-full bg-indigo-100" />
            </div>
            <div className="h-2 w-6 rounded-full bg-indigo-100" />
          </div>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-white p-2">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-indigo-700" strokeWidth={1.8} aria-hidden />
            <div className="h-2 w-20 rounded-full bg-indigo-100" />
          </div>
        </div>
      </div>
      <span className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-indigo-200 bg-white text-indigo-700">
        <BellRing className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </span>
    </div>
  );
}

function PerspectiveCard({
  copy,
  illustration,
}: {
  copy: PerspectiveCardCopy;
  illustration: ReactNode;
}) {
  return (
    <article className="rounded-[26px] border border-[rgb(var(--foreground-rgb)/0.12)] bg-white p-5 text-left">
      {illustration}
      <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
        {copy.title}
      </h3>
      <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
        {copy.description}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--foreground-rgb)/0.78)]">
        {copy.steps.map((step, index) => (
          <li key={`${copy.title}-${index}`} className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rt-primary)]"
              strokeWidth={1.8}
              aria-hidden
            />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function FeaturePerspectives({ copy }: FeaturePerspectivesProps) {
  return (
    <section className="w-full max-w-[1100px] rounded-[30px] border border-[rgb(var(--foreground-rgb)/0.1)] bg-[rgb(var(--foreground-rgb)/0.02)] p-4 md:p-7">
      <header className="mx-auto mb-6 max-w-3xl text-center">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.72)] md:text-base">
          {copy.subtitle}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <PerspectiveCard
          copy={copy.courtOwner}
          illustration={<CourtOwnerIllustration />}
        />
        <PerspectiveCard
          copy={copy.groupOwner}
          illustration={<GroupOwnerIllustration />}
        />
        <PerspectiveCard
          copy={copy.regularUser}
          illustration={<RegularUserIllustration />}
        />
      </div>
    </section>
  );
}
