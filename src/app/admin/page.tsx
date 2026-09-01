import Link from "next/link";
import AdminPanel from "@/components/AdminPanel";
import RetentionPanel from "@/components/RetentionPanel";
import ModerationQueue from "@/components/ModerationQueue";

export default function AdminPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-4 pb-8 pt-5">
      <Link href="/profile" className="text-sm text-muted">
        ← Volver
      </Link>

      <section className="flex flex-col gap-4">
        <header>
          <h1 className="text-xl font-bold">Retención</h1>
          <p className="text-sm text-muted">
            La métrica decisiva del documento de producto: si esto no funciona, nada más importa.
          </p>
        </header>
        <RetentionPanel />
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <h1 className="text-xl font-bold">Moderación</h1>
          <p className="text-sm text-muted">
            Reportes pendientes de Pulses y comentarios. Ocultar retira el contenido del feed de
            todo el mundo sin borrarlo.
          </p>
        </header>
        <ModerationQueue />
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <h1 className="text-xl font-bold">Pipeline de ingesta</h1>
          <p className="text-sm text-muted">
            Vista interna del sistema real que alimenta PULSE: Hacker News, Wikipedia (pageviews)
            y GitHub. Cada fuente puede fallar de forma independiente sin tumbar el pipeline.
          </p>
        </header>
        <AdminPanel />
      </section>
    </div>
  );
}
