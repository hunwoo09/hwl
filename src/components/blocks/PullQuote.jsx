const mono = '"Sequel Sans Heavy Disp"'

export default function PullQuote({ quote, attribution, variant = 'center' }) {
  if (!quote) return null
  const centered = variant === 'center'

  return (
    <section
      className={`w-full bg-black max-w-[1000px] mx-auto ${centered ? 'text-center' : 'text-left'}`}
      style={{ paddingInline: 64, paddingBlock: 96 }}
    >
      <blockquote
        className={`font-serif text-white font-light leading-tight ${centered ? '' : 'md:pl-12 md:border-l md:border-[#333]'}`}
        style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.75rem)' }}
      >
        “{quote}”
      </blockquote>
      {attribution && (
        <p
          style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.3em' }}
          className={`text-[#888] uppercase mt-6 ${centered ? '' : 'md:pl-12'}`}
        >
          {attribution}
        </p>
      )}
    </section>
  )
}
