import Link from "next/link";

const links = [
  { href: "/", label: "Check eligibility" },
  { href: "/fees", label: "Fees" },
  { href: "/scholarship", label: "Scholarship" },
  { href: "/apply", label: "Apply" },
];

export default function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" aria-label="IDM Eswatini home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/idm-logo.png" alt="IDM Institute of Development Management" width={96} height={48} className="h-12 w-auto" />
        </Link>
        <nav aria-label="Main" className="-mr-4 flex gap-1 overflow-x-auto pr-4 text-sm font-medium">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded px-3 py-2 text-ink hover:bg-paper hover:text-brand">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
