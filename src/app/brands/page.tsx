import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function BrandsPage() {
  return <ResourceManager {...pageConfigs.brands} />;
}
