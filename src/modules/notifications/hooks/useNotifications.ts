"use client";

/**
 * LabourSeva — useNotifications Hook
 * High-performance, singleton-synchronized polling hook for user notifications.
 * Solves the repeated request issue:
 *  - 45s configurable interval
 *  - Page visibility aware (pauses when tab is hidden)
 *  - In-flight request abortion via AbortController
 *  - Prevents overlapping requests
 *  - Shared listener bus across multiple bell instances (e.g. desktop + mobile)
 *  - Optimistic UI updates with rollback on network failure
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { InAppNotificationItem, NotificationFilter, NotificationListResponse } from "../types/notification.types";

interface UseNotificationsOptions {
  pollingIntervalMs?: number; // Default: 45,000ms (45 seconds)
  enabled?: boolean;
  limit?: number;
}

// Module-level shared state bus for synchronization between desktop and mobile headers
type NotificationListener = () => void;
const listeners = new Set<NotificationListener>();

let sharedNotifications: InAppNotificationItem[] = [];
let sharedUnreadCount = 0;
let sharedTotalCount = 0;
let sharedHasMore = false;
let sharedPage = 1;
let sharedFilter: NotificationFilter = "ALL";
let isSharedFetching = false;
let sharedTimer: NodeJS.Timeout | null = null;
let sharedAbortController: AbortController | null = null;
let activeSubscriberCount = 0;

function notifySubscribers() {
  listeners.forEach((listener) => listener());
}

async function executeSharedFetch(
  page = 1,
  limit = 15,
  filter: NotificationFilter = sharedFilter,
  isAppend = false
) {
  if (isSharedFetching) return;

  // Check document visibility
  if (typeof document !== "undefined" && document.visibilityState === "hidden" && page === 1 && !isAppend) {
    return;
  }

  // Cancel prior in-flight request
  if (sharedAbortController) {
    sharedAbortController.abort();
  }
  sharedAbortController = new AbortController();

  isSharedFetching = true;
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      filter,
    });

    const res = await fetch(`/api/notifications?${params.toString()}`, {
      signal: sharedAbortController.signal,
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // User not logged in; reset unread count and do not poll
        sharedNotifications = [];
        sharedUnreadCount = 0;
        sharedTotalCount = 0;
        notifySubscribers();
      }
      return;
    }

    const data: NotificationListResponse = await res.json();
    if (data.ok) {
      if (isAppend) {
        // Deduplicate appending items
        const existingIds = new Set(sharedNotifications.map((n) => n.id));
        const newItems = data.notifications.filter((n) => !existingIds.has(n.id));
        sharedNotifications = [...sharedNotifications, ...newItems];
      } else {
        sharedNotifications = data.notifications || [];
      }

      sharedUnreadCount = typeof data.unreadCount === "number" ? data.unreadCount : 0;
      sharedTotalCount = typeof data.totalCount === "number" ? data.totalCount : sharedNotifications.length;
      sharedHasMore = !!data.hasMore;
      sharedPage = page;
      sharedFilter = filter;
      notifySubscribers();
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      // Non-blocking fetch fail
    }
  } finally {
    isSharedFetching = false;
  }
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { pollingIntervalMs = 45000, enabled = true, limit = 15 } = options;

  const [, setTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forceRender = useCallback(() => setTick((t) => t + 1), []);

  // Subscribe to shared module state
  useEffect(() => {
    listeners.add(forceRender);
    activeSubscriberCount++;

    return () => {
      listeners.delete(forceRender);
      activeSubscriberCount--;
      if (activeSubscriberCount <= 0) {
        if (sharedTimer) {
          clearInterval(sharedTimer);
          sharedTimer = null;
        }
        if (sharedAbortController) {
          sharedAbortController.abort();
          sharedAbortController = null;
        }
      }
    };
  }, [forceRender]);

  // Initial fetch and visibility-aware polling timer
  useEffect(() => {
    if (!enabled) return;

    // Run initial fetch if empty
    if (sharedNotifications.length === 0 && !isSharedFetching) {
      setIsLoading(true);
      executeSharedFetch(1, limit, sharedFilter).finally(() => setIsLoading(false));
    }

    // Set up singleton timer
    if (!sharedTimer) {
      sharedTimer = setInterval(() => {
        executeSharedFetch(1, limit, sharedFilter);
      }, pollingIntervalMs);
    }

    // Handle visibility changes (pause when hidden, refresh once on regain focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        executeSharedFetch(1, limit, sharedFilter);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, limit, pollingIntervalMs]);

  // Public manual refresh
  const refetch = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        await executeSharedFetch(page, limit, sharedFilter);
      } catch (err: any) {
        setError(err?.message || "Failed to load notifications");
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  // Load next page
  const loadMore = useCallback(async () => {
    if (!sharedHasMore || isLoadingMore || isSharedFetching) return;
    setIsLoadingMore(true);
    try {
      await executeSharedFetch(sharedPage + 1, limit, sharedFilter, true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, limit]);

  // Filter change
  const setFilter = useCallback(
    async (newFilter: NotificationFilter) => {
      sharedFilter = newFilter;
      setIsLoading(true);
      try {
        await executeSharedFetch(1, limit, newFilter);
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  // Mark single notification as read (with optimistic update and rollback)
  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    const prevNotifications = [...sharedNotifications];
    const prevUnreadCount = sharedUnreadCount;

    const target = sharedNotifications.find((n) => n.id === id);
    if (!target || target.isRead) return true;

    // Optimistic update
    sharedNotifications = sharedNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    sharedUnreadCount = Math.max(0, sharedUnreadCount - 1);
    notifySubscribers();

    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to mark as read");
      return true;
    } catch (err) {
      // Rollback on failure
      sharedNotifications = prevNotifications;
      sharedUnreadCount = prevUnreadCount;
      notifySubscribers();
      return false;
    }
  }, []);

  // Mark all as read (with optimistic update and rollback)
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    const prevNotifications = [...sharedNotifications];
    const prevUnreadCount = sharedUnreadCount;

    if (sharedUnreadCount === 0) return true;

    // Optimistic update
    sharedNotifications = sharedNotifications.map((n) => ({
      ...n,
      isRead: true,
      readAt: n.readAt || new Date().toISOString(),
    }));
    sharedUnreadCount = 0;
    notifySubscribers();

    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to mark all as read");
      return true;
    } catch (err) {
      // Rollback on failure
      sharedNotifications = prevNotifications;
      sharedUnreadCount = prevUnreadCount;
      notifySubscribers();
      return false;
    }
  }, []);

  return {
    notifications: sharedNotifications,
    unreadCount: sharedUnreadCount,
    totalCount: sharedTotalCount,
    hasMore: sharedHasMore,
    isLoading,
    isLoadingMore,
    error,
    filter: sharedFilter,
    setFilter,
    refetch,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
}
