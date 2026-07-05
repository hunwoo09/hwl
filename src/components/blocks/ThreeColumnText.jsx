const mono = '"Sequel Sans Heavy Disp"'

export default function ThreeColumnText({ heading, columns = [], variant = 'even' }) {
  return (
    <section className="w-full bg-black px-6 md:px-16 py-20 max-w-[1400px] mx-auto">
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
              'font-serif text-[#ccc] text-[15px] leading-relaxed font-light text-balance',
              variant === 'lead-wide' && i === 0 ? 'md:col-span-2' : '',
            ].join(' ')}
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {text}
          </p>
        ))}
      </div>
    </section>
  )
}
