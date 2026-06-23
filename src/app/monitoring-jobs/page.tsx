import { ResourceManager } from "@/components/resource-manager";
import { pageConfigs } from "@/lib/page-configs";

export default function MonitoringJobsPage() {
  return <ResourceManager {...pageConfigs["monitoring-jobs"]} />;
}
