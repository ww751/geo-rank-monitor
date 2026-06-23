import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function ContentsPage() {
  return <ResourceManager {...pageConfigs.contents} />;
}
