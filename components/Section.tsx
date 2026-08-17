type Props = {
  id?: string;
  index: string;
  label: string;
  children: React.ReactNode;
  className?: string;
};

export default function Section({ id, index, label, children, className = "" }: Props) {
  return (
    <section id={id} className={`relative border-t border-line ${className}`}>
      <div className="relative mx-auto max-w-[1120px] px-6 py-24 md:py-32">
        <span aria-hidden className="tick -top-[7px] left-6 md:left-5" />
        <span aria-hidden className="tick -top-[7px] right-6 md:right-5" />
        <div className="mono-label mb-12 flex items-baseline gap-4 text-muted">
          <span className="text-copper">{index}</span>
          <span>{label}</span>
        </div>
        {children}
      </div>
    </section>
  );
}
