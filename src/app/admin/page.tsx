import Link from "next/link";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-5">
      <Link href="/profile" className="text-sm text-muted">
        ← Volver
      </Link>
      <header>
        <h1 className="text-xl font-bold">Pipeline de ingesta</h1>
        <p className="text-sm text-muted">
          Vista interna del sistema real que alimenta PULSE: Hacker News, Wikipedia (pageviews)
          y GitHub. Cada fuente puede fallar de forma independiente sin tumbar el pipeline.
        </p>
      </header>
      <AdminPanel />
    </div>
  );
}
