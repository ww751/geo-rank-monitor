import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function KeywordsPage() {
  return <ResourceManager {...pageConfigs.keywords} />;
}
