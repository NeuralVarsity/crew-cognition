import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your workspace — TalentAI" },
      { name: "description", content: "Set up your organization to get started." },
      { property: "og:title", content: "Create your workspace — TalentAI" },
      { property: "og:description", content: "Set up your organization to get started." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_organization_and_join", {
        _name: name,
        _industry: industry || null,
        _country: country || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Workspace created");
      await refresh();
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>Tell us about your organization to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ob-name">Organization name</Label>
              <Input id="ob-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-industry">Industry</Label>
              <Input id="ob-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Software, Finance…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-country">Country</Label>
              <Input id="ob-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
            </div>
            <Button type="submit" className="w-full" disabled={m.isPending}>
              {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}