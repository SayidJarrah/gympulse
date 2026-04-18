interface Props {
  h: number;
  m: number;
  s: number;
  label?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function Cell({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex min-w-[96px] flex-col items-center">
      <span
        className="font-['Barlow_Condensed'] text-[88px] font-bold leading-[0.95] tracking-[-0.02em] text-[#4ADE80] [font-variant-numeric:tabular-nums]"
      >
        {pad(value)}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#6B7280]">
        {unit}
      </span>
    </div>
  )
}

export function BigCountdown({ h, m, s, label }: Props) {
  return (
    <div>
      {label && (
        <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6B7280]">
          {label}
        </p>
      )}
      <div className="flex items-start">
        <Cell value={h} unit="Hours" />
        <span className="font-['Barlow_Condensed'] text-[88px] font-bold leading-[0.95] mx-0.5 text-[#4B5563] opacity-40">
          :
        </span>
        <Cell value={m} unit="Min" />
        <span className="font-['Barlow_Condensed'] text-[88px] font-bold leading-[0.95] mx-0.5 text-[#4B5563] opacity-40">
          :
        </span>
        <Cell value={s} unit="Sec" />
      </div>
    </div>
  )
}
