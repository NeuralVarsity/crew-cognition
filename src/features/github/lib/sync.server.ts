import type { SupabaseClient } from "@supabase/supabase-js";
import { gh, ghPaginate, GithubError } from "./github-api.server";
import { decryptToken } from "./crypto.server";

type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  visibility?: string;
  language: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  size: number;
  pushed_at: string | null;
  created_at: string;
  archived: boolean;
  disabled: boolean;
};

type GhUser = {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  followers?: number;
  following?: number;
  public_repos?: number;
};

type Stats = {
  repositories: number;
  contributors: number;
  commits: number;
  pull_requests: number;
  issues: number;
  reviews: number;
  errors: string[];
};

function emptyStats(): Stats {
  return { repositories: 0, contributors: 0, commits: 0, pull_requests: 0, issues: 0, reviews: 0, errors: [] };
}

async function upsertContributor(
  admin: SupabaseClient,
  orgId: string,
  user: GhUser | null | undefined,
): Promise<string | null> {
  if (!user?.id || !user.login) return null;
  const { data, error } = await admin
    .from("github_contributors")
    .upsert(
      {
        organization_id: orgId,
        github_id: user.id,
        login: user.login,
        name: user.name ?? null,
        email: user.email ?? null,
        avatar: user.avatar_url ?? null,
        bio: user.bio ?? null,
        company: user.company ?? null,
        location: user.location ?? null,
        followers: user.followers ?? 0,
        following: user.following ?? 0,
        public_repos: user.public_repos ?? 0,
      },
      { onConflict: "organization_id,github_id" },
    )
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

export async function syncConnection(
  admin: SupabaseClient,
  connectionId: string,
  opts: { maxRepos?: number; commitsPerRepo?: number; prsPerRepo?: number; issuesPerRepo?: number } = {},
): Promise<Stats> {
  const stats = emptyStats();
  const maxRepos = opts.maxRepos ?? 25;
  const commitsPerRepo = opts.commitsPerRepo ?? 100;
  const prsPerRepo = opts.prsPerRepo ?? 30;
  const issuesPerRepo = opts.issuesPerRepo ?? 30;

  const { data: conn, error: connErr } = await admin
    .from("github_connections")
    .select("id, organization_id, access_token_ciphertext")
    .eq("id", connectionId)
    .single();
  if (connErr || !conn) throw new Error("Connection not found");

  const token = decryptToken(conn.access_token_ciphertext);
  const orgId = conn.organization_id;

  // 1. Repositories (user affiliations)
  let repos: GhRepo[] = [];
  try {
    repos = await ghPaginate<GhRepo>(
      token,
      "/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed",
      Math.ceil(maxRepos / 100),
      Math.min(100, maxRepos),
    );
    repos = repos.slice(0, maxRepos);
  } catch (e) {
    stats.errors.push(`repos: ${(e as Error).message}`);
    return stats;
  }

  for (const repo of repos) {
    try {
      const visibility = repo.private ? "private" : (repo.visibility === "internal" ? "internal" : "public");
      const { data: repoRow, error: repoErr } = await admin
        .from("github_repositories")
        .upsert(
          {
            organization_id: orgId,
            connection_id: connectionId,
            github_id: repo.id,
            owner: repo.owner.login,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            visibility,
            language: repo.language,
            default_branch: repo.default_branch,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            open_issues: repo.open_issues_count,
            watchers: repo.watchers_count,
            size_kb: repo.size,
            pushed_at: repo.pushed_at,
            repo_created_at: repo.created_at,
            archived: repo.archived,
            disabled: repo.disabled,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,github_id" },
        )
        .select("id")
        .single();
      if (repoErr || !repoRow) {
        stats.errors.push(`repo ${repo.full_name}: ${repoErr?.message}`);
        continue;
      }
      stats.repositories++;
      const repoId = repoRow.id;

      // Contributors
      try {
        const contribs = await ghPaginate<{ id: number; login: string; avatar_url: string; contributions: number; type: string }>(
          token,
          `/repos/${repo.full_name}/contributors`,
          1,
          30,
        );
        for (const c of contribs) {
          if (c.type === "Bot") continue;
          const contribId = await upsertContributor(admin, orgId, {
            id: c.id,
            login: c.login,
            avatar_url: c.avatar_url,
          });
          if (contribId) {
            await admin.from("github_repo_contributors").upsert(
              {
                organization_id: orgId,
                repository_id: repoId,
                contributor_id: contribId,
                contributions: c.contributions,
              },
              { onConflict: "repository_id,contributor_id" },
            );
            stats.contributors++;
          }
        }
      } catch (e) {
        if (e instanceof GithubError && e.rateLimited) throw e;
        stats.errors.push(`contributors ${repo.full_name}: ${(e as Error).message}`);
      }

      // Commits
      try {
        const commits = await ghPaginate<{
          sha: string;
          commit: { message: string; author: { name?: string; email?: string; date: string } };
          author: GhUser | null;
        }>(token, `/repos/${repo.full_name}/commits`, Math.ceil(commitsPerRepo / 100), Math.min(100, commitsPerRepo));
        for (const c of commits.slice(0, commitsPerRepo)) {
          const authorId = await upsertContributor(admin, orgId, c.author ?? undefined);
          await admin.from("github_commits").upsert(
            {
              organization_id: orgId,
              repository_id: repoId,
              sha: c.sha,
              author_contributor_id: authorId,
              author_login: c.author?.login ?? null,
              author_email: c.commit.author.email ?? null,
              message: c.commit.message?.slice(0, 2000) ?? null,
              branch: repo.default_branch,
              committed_at: c.commit.author.date,
            },
            { onConflict: "repository_id,sha" },
          );
          stats.commits++;
        }
      } catch (e) {
        if (e instanceof GithubError && e.rateLimited) throw e;
        stats.errors.push(`commits ${repo.full_name}: ${(e as Error).message}`);
      }

      // Pull requests
      try {
        const prs = await ghPaginate<{
          id: number;
          number: number;
          title: string;
          body: string | null;
          state: "open" | "closed";
          merged_at: string | null;
          draft: boolean;
          user: GhUser | null;
          base: { ref: string };
          head: { ref: string };
          created_at: string;
          closed_at: string | null;
          comments?: number;
        }>(token, `/repos/${repo.full_name}/pulls?state=all&sort=updated&direction=desc`, 1, Math.min(100, prsPerRepo));
        for (const p of prs.slice(0, prsPerRepo)) {
          const authorId = await upsertContributor(admin, orgId, p.user ?? undefined);
          const state = p.merged_at ? "merged" : p.state;
          const { data: prRow } = await admin
            .from("github_pull_requests")
            .upsert(
              {
                organization_id: orgId,
                repository_id: repoId,
                github_id: p.id,
                number: p.number,
                title: p.title,
                body: p.body?.slice(0, 2000) ?? null,
                state,
                merged: !!p.merged_at,
                draft: p.draft,
                author_contributor_id: authorId,
                author_login: p.user?.login ?? null,
                base_branch: p.base?.ref ?? null,
                head_branch: p.head?.ref ?? null,
                comment_count: p.comments ?? 0,
                pr_created_at: p.created_at,
                closed_at: p.closed_at,
                merged_at: p.merged_at,
              },
              { onConflict: "repository_id,number" },
            )
            .select("id")
            .single();
          stats.pull_requests++;

          // Reviews for the 10 most recent PRs only
          if (prRow && stats.pull_requests <= 10) {
            try {
              const reviews = await gh<Array<{
                id: number;
                user: GhUser | null;
                state: string;
                body: string | null;
                submitted_at: string | null;
              }>>(token, `/repos/${repo.full_name}/pulls/${p.number}/reviews`);
              for (const r of reviews) {
                const reviewerId = await upsertContributor(admin, orgId, r.user ?? undefined);
                const st = r.state?.toLowerCase();
                const mappedState =
                  st === "approved"
                    ? "approved"
                    : st === "changes_requested"
                      ? "changes_requested"
                      : st === "dismissed"
                        ? "dismissed"
                        : st === "pending"
                          ? "pending"
                          : "commented";
                await admin.from("github_reviews").upsert(
                  {
                    organization_id: orgId,
                    pull_request_id: prRow.id,
                    github_id: r.id,
                    reviewer_contributor_id: reviewerId,
                    reviewer_login: r.user?.login ?? null,
                    state: mappedState,
                    body: r.body?.slice(0, 1000) ?? null,
                    submitted_at: r.submitted_at,
                  },
                  { onConflict: "pull_request_id,github_id" },
                );
                stats.reviews++;
              }
              await admin
                .from("github_pull_requests")
                .update({ review_count: reviews.length })
                .eq("id", prRow.id);
            } catch (e) {
              if (e instanceof GithubError && e.rateLimited) throw e;
            }
          }
        }
      } catch (e) {
        if (e instanceof GithubError && e.rateLimited) throw e;
        stats.errors.push(`prs ${repo.full_name}: ${(e as Error).message}`);
      }

      // Issues (excluding PRs)
      try {
        const issues = await ghPaginate<{
          id: number;
          number: number;
          title: string;
          body: string | null;
          state: "open" | "closed";
          labels: Array<{ name: string; color?: string }>;
          assignee: GhUser | null;
          user: GhUser | null;
          comments?: number;
          created_at: string;
          closed_at: string | null;
          pull_request?: unknown;
        }>(token, `/repos/${repo.full_name}/issues?state=all&sort=updated&direction=desc`, 1, Math.min(100, issuesPerRepo));
        for (const i of issues.slice(0, issuesPerRepo)) {
          if (i.pull_request) continue;
          const assigneeId = await upsertContributor(admin, orgId, i.assignee ?? undefined);
          const authorId = await upsertContributor(admin, orgId, i.user ?? undefined);
          await admin.from("github_issues").upsert(
            {
              organization_id: orgId,
              repository_id: repoId,
              github_id: i.id,
              number: i.number,
              title: i.title,
              body: i.body?.slice(0, 2000) ?? null,
              state: i.state,
              labels: i.labels?.map((l) => ({ name: l.name, color: l.color })) ?? [],
              assignee_contributor_id: assigneeId,
              assignee_login: i.assignee?.login ?? null,
              author_contributor_id: authorId,
              author_login: i.user?.login ?? null,
              comment_count: i.comments ?? 0,
              issue_created_at: i.created_at,
              closed_at: i.closed_at,
            },
            { onConflict: "repository_id,number" },
          );
          stats.issues++;
        }
      } catch (e) {
        if (e instanceof GithubError && e.rateLimited) throw e;
        stats.errors.push(`issues ${repo.full_name}: ${(e as Error).message}`);
      }
    } catch (e) {
      if (e instanceof GithubError && e.rateLimited) {
        stats.errors.push(`Rate limited at ${repo.full_name}`);
        break;
      }
      stats.errors.push(`repo ${repo.full_name}: ${(e as Error).message}`);
    }
  }

  await admin
    .from("github_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: stats.errors.length === 0 ? "success" : stats.repositories > 0 ? "partial" : "failed",
    })
    .eq("id", connectionId);

  return stats;
}