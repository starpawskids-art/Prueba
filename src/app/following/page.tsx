import BottomNav from "@/components/BottomNav";
import CollectionView from "@/components/CollectionView";

export default function FollowingPage() {
  return (
    <>
      <CollectionView
        title="Sigues"
        subtitle="Acontecimientos y temas que quieres seguir de cerca."
        field="following"
        emptyText="No sigues ninguna Pulse todavía. Toca «Seguir» en cualquier tarjeta."
      />
      <BottomNav />
    </>
  );
}
