import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/github/callback")({
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
            headers: { Location: `${origin}/github?${q.toString()}` },
          });
        };

        if (oauthError) return redirectTo({ error: oauthError });
        if (!code || !state) return redirectTo({ error: "missing_params" });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { exchangeOAuthCode, gh } = await import("@/features/github/lib/github-api.server");
          const { encryptToken } = await import("@/features/github/lib/crypto.server");

          const { data: st, error: stErr } = await supabaseAdmin
            .from("github_oauth_states")
            .select("state, organization_id, user_id, expires_at")
            .eq("state", state)
            .maybeSingle();
          if (stErr || !st) return redirectTo({ error: "invalid_state" });
          if (new Date(st.expires_at).getTime() < Date.now()) {
            await supabaseAdmin.from("github_oauth_states").delete().eq("state", state);
            return redirectTo({ error: "state_expired" });
          }

          const token = await exchangeOAuthCode(code);
          const user = await gh<{
            id: number;
            login: string;
            avatar_url: string;
            type: string;
          }>(token.access_token, "/user");

          await supabaseAdmin.from("github_connections").upsert(
            {
              organization_id: st.organization_id,
              github_login: user.login,
              github_account_id: user.id,
              account_type: user.type === "Organization" ? "organization" : "user",
              avatar: user.avatar_url,
              scope: token.scope ?? null,
              access_token_ciphertext: encryptToken(token.access_token),
              refresh_token_ciphertext: token.refresh_token ? encryptToken(token.refresh_token) : null,
              token_expires_at: token.expires_in
                ? new Date(Date.now() + token.expires_in * 1000).toISOString()
                : null,
              connected_by: st.user_id,
            },
            { onConflict: "organization_id,github_login" },
          );

          await supabaseAdmin.from("github_oauth_states").delete().eq("state", state);

          return redirectTo({ connected: user.login });
        } catch (e) {
          console.error("[github callback]", e);
          return redirectTo({ error: "connect_failed" });
        }
      },
    },
  },
});