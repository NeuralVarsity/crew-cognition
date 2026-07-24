import { useQuery } from "@tanstack/react-query";
import {
  getGithubConnection,
  getGithubStats,
  listCommits,
  listContributors,
  listIssues,
  listPullRequests,
  listRepositories,
  listSyncLogs,
} from "./api/github.functions";

export const useGithubConnection = () =>
  useQuery({ queryKey: ["gh", "connection"], queryFn: () => getGithubConnection() });

export const useGithubStats = (enabled: boolean) =>
  useQuery({ queryKey: ["gh", "stats"], queryFn: () => getGithubStats(), enabled });

export const useGithubRepositories = (enabled: boolean) =>
  useQuery({ queryKey: ["gh", "repos"], queryFn: () => listRepositories(), enabled });

export const useGithubContributors = (enabled: boolean) =>
  useQuery({ queryKey: ["gh", "contributors"], queryFn: () => listContributors(), enabled });

export const useGithubCommits = (enabled: boolean) =>
  useQuery({ queryKey: ["gh", "commits"], queryFn: () => listCommits(), enabled });

export const useGithubPullRequests = (enabled: boolean) =>
  useQuery({ queryKey: ["gh", "prs"], queryFn: () => listPullRequests(), enabled });

export const useGithubIssues = (enabled: boolean) =>
  useQuery({ queryKey: ["gh", "issues"], queryFn: () => listIssues(), enabled });

export const useGithubSyncLogs = (enabled: boolean) =>
  useQuery({ queryKey: ["gh", "logs"], queryFn: () => listSyncLogs(), enabled });