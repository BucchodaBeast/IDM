import Link from "next/link";

const links = [
  { href: "/", label: "Check eligibility" },
  { href: "/fees", label: "Fees" },
  { href: "/scholarship", label: "Scholarship" },
  { href: "/apply", label: "Apply" },
];

export default function Header() {
  return (
    <header className="bg-navy-deep text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold">IDM Apply</Link>
        <nav aria-label="Main" className="-mr-4 flex gap-1 overflow-x-auto pr-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded px-3 py-2 hover:bg-white/10">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
