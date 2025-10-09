import { SecretRotationDashboard } from "@/components/security/SecretRotationDashboard";
import { IdempotencyKeyMonitor } from "@/components/security/IdempotencyKeyMonitor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key } from "lucide-react";

export default function SecretManagement() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Security & Secret Management</h1>
        <p className="text-muted-foreground">
          Manage API keys, monitor secret rotation, and track idempotent operations
        </p>
      </div>

      <Tabs defaultValue="secrets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="secrets" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Secret Rotation
          </TabsTrigger>
          <TabsTrigger value="idempotency" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Idempotency Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="secrets">
          <SecretRotationDashboard />
        </TabsContent>

        <TabsContent value="idempotency">
          <IdempotencyKeyMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
