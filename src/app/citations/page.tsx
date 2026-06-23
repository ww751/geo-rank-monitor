import { CheckCitationsButton } from "@/components/check-citations-button";
import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function CitationsPage() {
  return (
    <div className="space-y-6">
      <CheckCitationsButton />
      <ResourceManager {...pageConfigs.citations} />
    </div>
  );
}
