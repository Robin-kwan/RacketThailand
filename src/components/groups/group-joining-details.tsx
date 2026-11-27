type GroupJoiningDetailsProps = {
  allowWalkIn: boolean | null;
  hasContact: boolean;
  copy: {
    walkIn: string;
    walkInsWelcome: string;
    walkInsClosed: string;
    walkInsUnknown: string;
    joiningHint: string;
  };
};

export function GroupJoiningDetails({ allowWalkIn, hasContact, copy }: GroupJoiningDetailsProps) {
  const status = allowWalkIn === true
    ? copy.walkInsWelcome
    : allowWalkIn === false
      ? copy.walkInsClosed
      : copy.walkInsUnknown;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">{copy.walkIn}</p>
      <p className="text-base font-semibold text-[var(--foreground)]">{status}</p>
      {hasContact && <p className="mt-2 text-sm leading-6 text-slate-600">{copy.joiningHint}</p>}
    </div>
  );
}
