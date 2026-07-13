import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#F3E9FB] via-[#FBF6F0] to-[#FDEFF3] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(45% 35% at 12% 10%, rgba(167,139,219,0.30), transparent), radial-gradient(40% 35% at 90% 20%, rgba(242,169,183,0.30), transparent), radial-gradient(45% 40% at 80% 95%, rgba(127,209,185,0.28), transparent)",
          }}
        />

        {/* soft paw print scatter */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          viewBox="0 0 400 500"
          fill="#8A6FBF"
        >
          {[
            [40, 60], [340, 40], [80, 220], [300, 260], [50, 400], [330, 430], [180, 120],
          ].map(([cx, cy], i) => (
            <g key={i} transform={`translate(${cx} ${cy}) rotate(${(i * 37) % 40 - 20}) scale(0.7)`}>
              <ellipse cx="0" cy="10" rx="9" ry="11" />
              <ellipse cx="-11" cy="-6" rx="4" ry="5.5" />
              <ellipse cx="-3.5" cy="-13" rx="4" ry="5.5" />
              <ellipse cx="4.5" cy="-13" rx="4" ry="5.5" />
              <ellipse cx="12" cy="-6" rx="4" ry="5.5" />
            </g>
          ))}
        </svg>

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-danger/20 shadow-sm">
            <Image src="/cat-mascot.png" alt="Rei-volution" width={36} height={36} className="h-full w-full object-cover" />
          </div>
          <span className="font-display text-xl font-bold tracking-wide text-foreground">Rei-volution</span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl font-bold leading-tight text-foreground">
            The evolution of your hustle. One tracker to rule them all. 🐾
          </p>
          <p className="mt-4 text-sm text-muted">
            Rei-volution brings your budget, savings goals, attendance, tasks, and calendar
            together — so nothing slips through the cracks, and it's kinda cute about it.
          </p>

          <div className="mt-8 flex items-end gap-3">
            <div className="bob flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-primary/15">
              <Image src="/cat-mascot.png" alt="" width={64} height={64} className="h-full w-full object-cover" />
            </div>
            <div className="bob flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-danger/15" style={{ animationDelay: "1.2s" }}>
              <Image src="/dog-mascot.png" alt="" width={64} height={64} className="h-full w-full object-cover" />
            </div>
            <div className="rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-xs text-muted backdrop-blur-sm">
              4.53% saved
              <br />
              <span className="text-foreground font-medium">this month 🎉</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex gap-6 text-xs text-muted">
          <span>© {new Date().getFullYear()} Rei-volution</span>
          <span>Made for people who track everything</span>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
