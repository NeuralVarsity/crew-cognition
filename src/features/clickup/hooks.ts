import { useQuery } from "@tanstack/react-query";
import {
  getClickUpAnalytics,
  getClickUpConnection,
  listClickUpFolders,
  listClickUpLists,
  listClickUpMembers,
  listClickUpSpaces,
  listClickUpSyncLogs,
  listClickUpTasks,
  listClickUpTimeEntries,
} from "./api/clickup.functions";

const STALE = 60_000;

export const useClickUpConnection = () =>
  useQuery({ queryKey: ["clickup", "connection"], queryFn: () => getClickUpConnection() });

export const useClickUpAnalytics = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "analytics"], queryFn: () => getClickUpAnalytics(), enabled, staleTime: STALE });

export const useClickUpSpaces = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "spaces"], queryFn: () => listClickUpSpaces(), enabled, staleTime: STALE });

export const useClickUpFolders = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "folders"], queryFn: () => listClickUpFolders(), enabled, staleTime: STALE });

export const useClickUpLists = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "lists"], queryFn: () => listClickUpLists(), enabled, staleTime: STALE });

export const useClickUpTasks = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "tasks"], queryFn: () => listClickUpTasks(), enabled, staleTime: STALE });

export const useClickUpMembers = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "members"], queryFn: () => listClickUpMembers(), enabled, staleTime: STALE });

export const useClickUpTimeEntries = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "time"], queryFn: () => listClickUpTimeEntries(), enabled, staleTime: STALE });

export const useClickUpSyncLogs = (enabled: boolean) =>
  useQuery({ queryKey: ["clickup", "logs"], queryFn: () => listClickUpSyncLogs(), enabled });