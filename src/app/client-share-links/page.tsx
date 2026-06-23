import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function ClientShareLinksPage() {
  return <ResourceManager {...pageConfigs["client-share-links"]} />;
}
