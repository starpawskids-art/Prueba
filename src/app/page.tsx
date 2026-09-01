import { redirect } from "next/navigation";
import { getOrCreateUserId, getUser } from "@/lib/user";
import FeedView from "@/components/FeedView";
import BottomNav from "@/components/BottomNav";

export default async function HomePage() {
  const userId = await getOrCreateUserId();
  const user = getUser(userId);

  if (!user || user.interests.length === 0) {
    redirect("/onboarding");
  }

  return (
    <>
      <FeedView />
      <BottomNav />
    </>
  );
}
