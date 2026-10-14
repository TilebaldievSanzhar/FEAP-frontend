/**
 * v3 page header band (design V3Head): full-bleed white strip under the
 * AppShell top bar with eyebrow, title · sub, actions and optional extras
 * (stepper, filters). Cancels the main's padding so it spans edge to edge.
 */
export function PageHead({
  eyebrow,
  title,
  sub,
  actions,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="-mx-8 -mt-7 mb-6 border-b border-[var(--border)] bg-[hsl(var(--card))] px-7 pb-[18px] pt-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
          <h1 className="text-2xl font-medium tracking-tight">
            {title}
            {sub ? <span className="font-normal text-[var(--text-subtle)]"> · {sub}</span> : null}
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
