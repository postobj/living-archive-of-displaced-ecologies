import { getNewsYear } from "@/lib/news-loader";
import NewsPageClient from "./NewsPageClient";

export default function NewsPage() {
  const newsYear = getNewsYear(new Date().getFullYear());

  return <NewsPageClient newsYear={newsYear} />;
}
