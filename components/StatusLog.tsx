"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Circle, ScrollText } from "lucide-react";
import { Badge } from "./ui/badge";
import { formatTime } from "@/lib/utils";

export interface StatusLogEntry {
  device?: string;
  latitude?: string;
  longitude?: string;
  timestamp: Date;
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
}

interface StatusLogProps {
  logs: StatusLogEntry[];
  maxDisplayed?: number;
}

export function StatusLog({ logs, maxDisplayed = 50 }: StatusLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const displayed = logs.slice(-maxDisplayed);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-gray-500" />
            Status Log
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
            displayed
              .slice()
              .reverse()
              .map((log) => {
                const isHighCpu = log.cpu_percent > 50;

                return (
                  <div
                    key={log.timestamp.getTime()}
                    className="rounded-md border bg-white px-3 py-2 shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>{formatTime(log.timestamp)}</span>
                      <span
                        className={`font-semibold ${
                          isHighCpu ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isHighCpu ? "ERROR" : "INFO"}
                      </span>
                    </div>

                    {log.device && (
                      <div className="text-[11px] text-purple-600 font-medium mb-1">
                        Device: {log.device}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-4 text-xs font-medium">
                      <div>
                        <span className="text-gray-400">CPU</span>
                        <div
                          className={`${
                            isHighCpu ? "text-red-600" : "text-gray-700"
                          }`}
                        >
                          {log.cpu_percent}%
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-400">RAM</span>
                        <div className="text-gray-700">
                          {log.ram_used_mb}MB / {log.ram_total_mb}MB
                          <span className="ml-1 text-gray-400">
                            ({log.ram_percent}%)
                          </span>
                        </div>
                      </div>
                    </div>
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
