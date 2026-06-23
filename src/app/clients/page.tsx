import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function ClientsPage() {
  return <ResourceManager {...pageConfigs.clients} />;
}
