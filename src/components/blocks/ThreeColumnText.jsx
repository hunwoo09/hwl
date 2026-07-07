const mono = '"Sequel Sans Heavy Body"'

export default function ThreeColumnText({ heading, columns = [], variant = 'even' }) {
  return (
    <section className="w-full bg-black max-w-[1400px] mx-auto" style={{ paddingInline: 64, paddingBlock: 80 }}>
      {heading && (
        <h3
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.3em' }}
          className="text-[#888] uppercase mb-10"
        >
          {heading}
        </h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8">
        {columns.map((text, i) => (
          <p
            key={i}
            className={[
              'text-[#ccc] text-[15px] leading-relaxed font-light text-balance',
              variant === 'lead-wide' && i === 0 ? 'md:col-span-2' : '',
            ].join(' ')}
            style={{ fontFamily: mono, whiteSpace: 'pre-wrap' }}
          >
            {text}
          </p>
        ))}
      </div>
    </section>
  )
}
