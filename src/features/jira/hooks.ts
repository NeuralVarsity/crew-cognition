import { useQuery } from "@tanstack/react-query";
import {
  getJiraAnalytics,
  getJiraConnection,
  listJiraEpics,
  listJiraIssues,
  listJiraProjects,
  listJiraSprints,
  listJiraSyncLogs,
  listJiraWorklogs,
} from "./api/jira.functions";

export const useJiraConnection = () =>
  useQuery({ queryKey: ["jira", "connection"], queryFn: () => getJiraConnection() });

export const useJiraAnalytics = (enabled: boolean) =>
  useQuery({ queryKey: ["jira", "analytics"], queryFn: () => getJiraAnalytics(), enabled });

export const useJiraProjects = (enabled: boolean) =>
  useQuery({ queryKey: ["jira", "projects"], queryFn: () => listJiraProjects(), enabled });

export const useJiraSprints = (enabled: boolean) =>
  useQuery({ queryKey: ["jira", "sprints"], queryFn: () => listJiraSprints(), enabled });

export const useJiraEpics = (enabled: boolean) =>
  useQuery({ queryKey: ["jira", "epics"], queryFn: () => listJiraEpics(), enabled });

export const useJiraIssues = (enabled: boolean) =>
  useQuery({ queryKey: ["jira", "issues"], queryFn: () => listJiraIssues(), enabled });

export const useJiraWorklogs = (enabled: boolean) =>
  useQuery({ queryKey: ["jira", "worklogs"], queryFn: () => listJiraWorklogs(), enabled });

export const useJiraSyncLogs = (enabled: boolean) =>
  useQuery({ queryKey: ["jira", "logs"], queryFn: () => listJiraSyncLogs(), enabled });