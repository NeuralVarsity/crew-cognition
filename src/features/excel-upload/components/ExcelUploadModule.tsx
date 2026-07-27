import { useState } from "react";
import { Download, FileSpreadsheet, History, LayoutDashboard, UploadCloud } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/providers/auth-provider";
import { UploadWizard } from "./upload-wizard";
import { UploadDashboard } from "./upload-dashboard";
import { ImportHistory } from "./import-history";
import { useImportJobs } from "../hooks";
import { downloadTemplate } from "../lib/reports";
import { DATASET_LIST } from "../types";

export function ExcelUploadModule() {
  const { canManageWorkforce } = useAuth();
  const jobs = useImportJobs();
  const [tab, setTab] = useState("upload");
  const imports = jobs.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excel Upload"
        description="Import employees, departments, projects and integration data from Excel or CSV files with validation, mapping and full audit history."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload"><UploadCloud className="mr-1.5 size-4" />Upload</TabsTrigger>
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-1.5 size-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 size-4" />History</TabsTrigger>
          <TabsTrigger value="templates"><FileSpreadsheet className="mr-1.5 size-4" />Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          {canManageWorkforce ? (
            <UploadWizard onFinished={() => setTab("history")} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Read-only access</CardTitle>
                <CardDescription>
                  Only admins and managers can import data. You can still review import history and dashboards.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          <UploadDashboard imports={imports} loading={jobs.isPending} />
        </TabsContent>

        <TabsContent value="history">
          <ImportHistory imports={imports} loading={jobs.isPending} canManage={canManageWorkforce} />
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Download import templates</CardTitle>
              <CardDescription>Pre-formatted headers for every supported dataset.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DATASET_LIST.map((dataset) => (
                <div key={dataset.key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{dataset.label}</p>
                    <p className="text-xs text-muted-foreground">{dataset.fields.length} columns</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(dataset.label, dataset.fields.map((f) => f.label))}
                  >
                    <Download className="mr-1.5 size-4" />
                    Template
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}