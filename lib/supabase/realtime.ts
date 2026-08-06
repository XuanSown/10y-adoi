"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSupabaseBrowser } from "./client";

type RealtimeStatus = "connecting" | "connected" | "disconnected" | "error";

export function useRealtimeSubscription(
  channelName: string,
  table: string,
  onUpdate: () => void
): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseDelay = 1000;

  const connect = useCallback(() => {
    const supabase = createSupabaseBrowser();

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as const,
        { event: "*", schema: "public", table },
        () => {
          onUpdate();
          reconnectAttempts.current = 0;
        }
      )
      .subscribe((subStatus: string) => {
        if (subStatus === "SUBSCRIBED") {
          setStatus("connected");
          reconnectAttempts.current = 0;
        } else if (subStatus === "CHANNEL_ERROR") {
          setStatus("error");
        } else if (subStatus === "CLOSED") {
          setStatus("disconnected");
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelName, table, onUpdate]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  useEffect(() => {
    if (status === "disconnected" || status === "error") {
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay =
          baseDelay * Math.pow(2, reconnectAttempts.current) +
          Math.random() * 1000;
        reconnectAttempts.current++;

        const timeout = setTimeout(() => {
          setStatus("connecting");
          connect();
        }, delay);

        return () => clearTimeout(timeout);
      }
    }
  }, [status, connect]);

  return { status };
}
