import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FolderKanban, Search, Users, UsersRound } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { organizationId } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const query = q.trim();
  const results = useQuery({
    queryKey: ["global-search", organizationId, query],
    enabled: open && !!organizationId && query.length >= 2,
    queryFn: async () => {
      const like = `%${query}%`;
      const [emps, depts, teams, projects] = await Promise.all([
        supabase.from("employees").select("id, full_name, designation").ilike("full_name", like).limit(5),
        supabase.from("departments").select("id, name").ilike("name", like).limit(5),
        supabase.from("teams").select("id, name").ilike("name", like).limit(5),
        supabase.from("projects").select("id, name, status").ilike("name", like).limit(5),
      ]);
      return {
        employees: emps.data ?? [],
        departments: depts.data ?? [],
        teams: teams.data ?? [],
        projects: projects.data ?? [],
      };
    },
  });

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-64 justify-start gap-2 text-muted-foreground xl:inline-flex xl:w-80"
      >
        <Search className="h-4 w-4" />
        <span className="text-xs">Search…</span>
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput value={q} onValueChange={setQ} placeholder="Search employees, teams, projects…" />
        <CommandList>
          <CommandEmpty>
            {query.length < 2 ? "Type at least 2 characters." : "No results."}
          </CommandEmpty>
          {results.data && (
            <>
              {results.data.employees.length > 0 && (
                <CommandGroup heading="Employees">
                  {results.data.employees.map((e) => (
                    <CommandItem key={e.id} onSelect={() => go("/employees")}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>{e.full_name}</span>
                      {e.designation && (
                        <span className="ml-auto text-xs text-muted-foreground">{e.designation}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.data.departments.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Departments">
                    {results.data.departments.map((d) => (
                      <CommandItem key={d.id} onSelect={() => go("/departments")}>
                        <Building2 className="mr-2 h-4 w-4" />
                        {d.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {results.data.teams.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Teams">
                    {results.data.teams.map((t) => (
                      <CommandItem key={t.id} onSelect={() => go("/teams")}>
                        <UsersRound className="mr-2 h-4 w-4" />
                        {t.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {results.data.projects.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Projects">
                    {results.data.projects.map((p) => (
                      <CommandItem key={p.id} onSelect={() => go("/projects")}>
                        <FolderKanban className="mr-2 h-4 w-4" />
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}