import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/clickup/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const oauthError = url.searchParams.get("error");
        const origin = url.origin;

        const redirectTo = (params: Record<string, string>) =>
          new Response(null, {
            status: 302,
            headers: { Location: `${origin}/clickup?${new URLSearchParams(params).toString()}` },
          });

        if (oauthError) return redirectTo({ error: oauthError });
        if (!code || !state) return redirectTo({ error: "missing_params" });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { exchangeOAuthCode, validateToken, clickup } = await import(
            "@/features/clickup/lib/clickup-api.server"
          );
          const { encryptToken } = await import("@/features/clickup/lib/crypto.server");

          const { data: st } = await supabaseAdmin
            .from("clickup_oauth_states")
            .select("state, organization_id, user_id, expires_at")
            .eq("state", state)
            .maybeSingle();
          if (!st) return redirectTo({ error: "invalid_state" });
          if (new Date(st.expires_at).getTime() < Date.now()) {
            await supabaseAdmin.from("clickup_oauth_states").delete().eq("state", state);
            return redirectTo({ error: "state_expired" });
          }

          const token = await exchangeOAuthCode(code, `${origin}/api/public/clickup/callback`);
          const me = await validateToken(token.access_token);
          const teams = await clickup<{ teams: Array<{ id: string; name: string; color?: string; avatar?: string }> }>(
            token.access_token,
            "/team",
          );
          const team = teams.teams?.[0];
          if (!team) return redirectTo({ error: "no_workspace" });

          await supabaseAdmin.from("clickup_connections").upsert(
            {
              organization_id: st.organization_id,
              workspace_id: team.id,
              workspace_name: team.name,
              workspace_color: team.color ?? null,
              workspace_avatar: team.avatar ?? null,
              access_token_ciphertext: encryptToken(token.access_token),
              connected_by: st.user_id,
              connected_user_name: me.user?.username ?? null,
              connected_user_email: me.user?.email ?? null,
            },
            { onConflict: "organization_id,workspace_id" },
          );

          await supabaseAdmin.from("clickup_oauth_states").delete().eq("state", state);
          return redirectTo({ connected: team.name });
        } catch (e) {
          console.error("[clickup callback]", e);
          return redirectTo({ error: "connect_failed" });
        }
      },
    },
  },
});