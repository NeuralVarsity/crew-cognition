import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/jira/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const oauthError = url.searchParams.get("error");
        const origin = url.origin;

        const redirectTo = (params: Record<string, string>) => {
          const q = new URLSearchParams(params);
          return new Response(null, {
            status: 302,
            headers: { Location: `${origin}/jira?${q.toString()}` },
          });
        };

        if (oauthError) return redirectTo({ error: oauthError });
        if (!code || !state) return redirectTo({ error: "missing_params" });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { exchangeOAuthCode, getAccessibleResources } = await import(
            "@/features/jira/lib/jira-api.server"
          );
          const { encryptToken } = await import("@/features/jira/lib/crypto.server");

          const { data: st, error: stErr } = await supabaseAdmin
            .from("jira_oauth_states")
            .select("state, organization_id, user_id, expires_at")
            .eq("state", state)
            .maybeSingle();
          if (stErr || !st) return redirectTo({ error: "invalid_state" });
          if (new Date(st.expires_at).getTime() < Date.now()) {
            await supabaseAdmin.from("jira_oauth_states").delete().eq("state", state);
            return redirectTo({ error: "state_expired" });
          }

          const token = await exchangeOAuthCode(code, `${origin}/api/public/jira/callback`);
          const sites = await getAccessibleResources(token.access_token);
          const site = sites[0];
          if (!site) return redirectTo({ error: "no_accessible_site" });

          await supabaseAdmin.from("jira_connections").upsert(
            {
              organization_id: st.organization_id,
              cloud_id: site.id,
              site_name: site.name,
              site_url: site.url,
              avatar: site.avatarUrl ?? null,
              scope: token.scope ?? null,
              access_token_ciphertext: encryptToken(token.access_token),
              refresh_token_ciphertext: token.refresh_token ? encryptToken(token.refresh_token) : null,
              token_expires_at: token.expires_in
                ? new Date(Date.now() + token.expires_in * 1000).toISOString()
                : null,
              connected_by: st.user_id,
            },
            { onConflict: "organization_id,cloud_id" },
          );

          await supabaseAdmin.from("jira_oauth_states").delete().eq("state", state);

          return redirectTo({ connected: site.name });
        } catch (e) {
          console.error("[jira callback]", e);
          return redirectTo({ error: "connect_failed" });
        }
      },
    },
  },
});