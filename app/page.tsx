import { getAllStories } from "@/lib/content";
import { HomepageHero } from "@/components/HomepageHero";

export default function Home() {
  const stories = getAllStories();
  const storyMetadata = stories.map((s) => s.metadata);

  return <HomepageHero stories={storyMetadata} />;
}
