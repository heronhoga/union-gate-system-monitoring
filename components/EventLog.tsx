"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Circle } from "lucide-react";
import { formatTime } from "@/lib/utils";

export interface EventLogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "success";
  message: string;
  device?: string;
  details?: string;
}

interface EventLogProps {
  logs: EventLogEntry[];
  maxDisplayed?: number;
}

const LEVEL_CONFIG: Record<
  EventLogEntry["level"],
  { label: string; color: string; bg: string; dot: string }
> = {
  info: {
    label: "INFO",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-100",
    dot: "text-blue-500",
  },
  success: {
    label: "OK",
    color: "text-green-600",
    bg: "bg-green-50 border-green-100",
    dot: "text-green-500",
  },
  warning: {
    label: "WARN",
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-100",
    dot: "text-yellow-500",
  },
  error: {
    label: "ERR",
    color: "text-red-600",
    bg: "bg-red-50 border-red-100",
    dot: "text-red-500",
  },
};

export function EventLog({ logs, maxDisplayed = 50 }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const displayed = logs.slice(-maxDisplayed);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-gray-500" />
            Event Log
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {logs.length} entri
            </Badge>
            {logs.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-60 overflow-y-auto font-mono text-xs px-4 pb-4 space-y-1 scroll-smooth">
          {displayed.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Menunggu data log...</p>
              </div>
            </div>
          ) : (
            displayed.reverse().map((log) => {
              const cfg = LEVEL_CONFIG[log.level];
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 rounded px-2 py-1.5 border ${cfg.bg} transition-all duration-300`}
                >
                  {/* Waktu */}
                  <span className="shrink-0 text-gray-400 leading-5 select-none">
                    {formatTime(log.timestamp)}
                  </span>
                  {/* Level badge */}
                  <span
                    className={`shrink-0 font-bold leading-5 w-10 text-center ${cfg.color}`}
                  >
                    [{cfg.label}]
                  </span>

                  {/* Device tag jika ada */}
                  {log.device && (
                    <span className="shrink-0 text-purple-600 leading-5">
                      [{log.device}]
                    </span>
                  )}

                  {/* Pesan */}
                  <span className="text-gray-700 leading-5 break-all">
                    {log.message}
                    {log.details && (
                      <span className="ml-1 text-gray-400">
                        — {log.details}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}
