import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function RankResultsPage() {
  return <ResourceManager {...pageConfigs["rank-results"]} />;
}
