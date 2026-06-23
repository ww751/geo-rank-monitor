import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function PipelineRunsPage() {
  return <ResourceManager {...pageConfigs["pipeline-runs"]} />;
}
