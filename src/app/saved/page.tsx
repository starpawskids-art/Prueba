import BottomNav from "@/components/BottomNav";
import CollectionView from "@/components/CollectionView";

export default function SavedPage() {
  return (
    <>
      <CollectionView
        title="Guardado"
        subtitle="Pulses que quisiste conservar."
        field="saved"
        emptyText="Aún no has guardado ninguna Pulse. Toca «Guardar» en cualquier tarjeta."
      />
      <BottomNav />
    </>
  );
}
