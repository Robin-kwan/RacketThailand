import type { ReactNode } from "react";

type SportFinderHeroProps = {
  sportName: string;
  sportAccent: string;
  imageUrl: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function SportFinderHero({
  sportName,
  sportAccent,
  imageUrl,
  title,
  description,
  children,
}: SportFinderHeroProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-slate-800 bg-[#10281e] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div aria-hidden className="absolute inset-0 bg-[#10281e]/35" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(8, 31, 23, 0.96) 0%, rgba(8, 31, 23, 0.88) 43%, rgba(8, 31, 23, 0.46) 69%, rgba(8, 31, 23, 0.14) 100%)",
        }}
      />
      <div className="relative mx-auto flex min-h-[260px] max-w-screen-xl flex-col justify-end px-6 py-9 md:min-h-[290px] md:px-10 md:py-11">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 text-sm font-semibold text-white/80">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: sportAccent }}
            />
            <span>{sportName}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 md:text-base">
            {description}
          </p>
        </div>
        {children ? (
          <div className="mt-6 flex flex-wrap gap-3">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
