import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function PlatformSessionsPage() {
  return <ResourceManager {...pageConfigs["platform-sessions"]} />;
}
