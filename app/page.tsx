"use client";

import { useEffect, useState, useCallback } from "react";
import { DeviceMap } from "@/components/DeviceMap";
import { EventLog, EventLogEntry } from "@/components/EventLog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wifi, WifiOff, Cpu, BarChart3 } from "lucide-react";
import { mqttService, DeviceData, QrEvent } from "@/lib/mqtt-service";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatTimestamp } from "@/lib/utils";
import { StatusLog, StatusLogEntry } from "@/components/StatusLog";

export default function Dashboard() {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isBrokerConnected, setIsBrokerConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  //logs
  const [EventLogs, setEventLogs] = useState<EventLogEntry[]>([]);
  const [StatusLogs, setStatusLogs] = useState<StatusLogEntry[]>([]);

  // GATE SELECTION
  const [open, setOpen] = useState(false);
  const GATE_OPTIONS = [
    { label: "Punceling Gate In 1", value: "BAGT2212111400001" },
  ];

  const [selectedDevice, setSelectedDevice] = useState(GATE_OPTIONS[0].value);
  // END GATE SELECTION

  const addLog = useCallback(
    (
      level: EventLogEntry["level"],
      message: string,
      device?: string,
      details?: string,
    ) => {
      const entry: EventLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        level,
        message,
        device,
        details,
      };
      setEventLogs((prev) => [...prev.slice(-199), entry]);
    },
    [],
  );

  const STATUS_TOPIC = `uniongate/${selectedDevice}/status`;
  const EVENT_TOPIC = `uniongate/${selectedDevice}/events`;

  useEffect(() => {
    let unsubscribeConnection: (() => void) | null = null;

    const initializeConnection = async () => {
      try {
        setIsConnecting(true);
        setError(null);
        setDeviceData(null);

        await mqttService.connect();

        unsubscribeConnection = mqttService.onConnectionChange((connected) => {
          if (connected) {
            setError(null);
          } else {
            addLog("warning", "Koneksi ke broker terputus");
          }
        });

        // Subscribe ke topic status (untuk data device)
        mqttService.subscribe(STATUS_TOPIC, (data: DeviceData) => {
          console.log("[Dashboard] Received device data:", data);
          setDeviceData(data);

          setStatusLogs((prev) => [
            ...prev.slice(-199),
            {
              device: data.device,
              timestamp: new Date(),
              cpu_percent: data.cpu_percent,
              ram_percent: data.ram_percent,
              ram_used_mb: data.ram_used_mb,
              ram_total_mb: data.ram_total_mb,
            },
          ]);
        });

        // Subscribe ke topic events untuk QR dan RFID
        mqttService.subscribeRaw(EVENT_TOPIC, (raw) => {
          try {
            console.log("[Dashboard] Raw event received:", raw);
            const ev = JSON.parse(raw);

            // Handle QR events
            if (ev.type === "qr") {
              const qrEvent = ev as QrEvent;
              console.log("[Dashboard] QR event:", qrEvent);
              const shortHash = qrEvent.qr_hash?.slice(0, 8) ?? "-";

              addLog(
                qrEvent.success ? "success" : "error",
                qrEvent.success
                  ? `✅ QR DITERIMA — Hash: ${shortHash}...`
                  : `🚫 QR DITOLAK — Hash: ${shortHash}...`,
                qrEvent.device,
                `Kode: ${qrEvent.code}`,
              );
            }
            // Handle RFID events (untuk masa depan)
            else if (ev.type === "rfid") {
              console.log("[Dashboard] RFID event:", ev);
              const shortHash = ev.card_hash?.slice(0, 8) ?? "-";

              addLog(
                ev.success ? "success" : "error",
                ev.success
                  ? `✅ RFID DITERIMA — Kartu: ${shortHash}...`
                  : `🚫 RFID DITOLAK — Kartu: ${shortHash}...`,
                ev.device,
                `Kode: ${ev.code}`,
              );
            }
            // Handle tipe event lain jika ada
            else {
              console.log("[Dashboard] Unknown event type:", ev.type, ev);
            }
          } catch (e) {
            console.error("Failed to parse event:", e, "Raw data:", raw);
          }
        });

        setIsConnecting(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to connect to MQTT broker";
        setError(errorMessage);
        setIsConnecting(false);
        addLog("error", `Gagal terhubung: ${errorMessage}`);
      }
    };

    initializeConnection();

    return () => {
      if (unsubscribeConnection) unsubscribeConnection();
      mqttService.unsubscribe(STATUS_TOPIC);
      mqttService.unsubscribeRaw(EVENT_TOPIC);
    };
  }, [selectedDevice, addLog]);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Device Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time monitoring and location tracking
          </p>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full max-w-64 justify-between"
              >
                {selectedDevice
                  ? GATE_OPTIONS.find((gate) => gate.value === selectedDevice)
                      ?.label
                  : "Select gate..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-full max-w-64 p-0 z-[1000]">
              <Command>
                <CommandInput placeholder="Search gate..." />
                <CommandEmpty>No gate found.</CommandEmpty>
                <CommandGroup>
                  {GATE_OPTIONS.map((gate) => (
                    <CommandItem
                      key={gate.value}
                      value={gate.value}
                      onSelect={(currentValue) => {
                        setSelectedDevice(currentValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedDevice === gate.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {gate.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Connection Status */}
        <div className="mb-6 flex items-center gap-2">
          {isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm font-medium text-blue-600">
                Connecting...
              </span>
            </>
          ) : deviceData ? (
            <>
              <Wifi className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                Connected to broker
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-600">
                Disconnected
              </span>
            </>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Connection Error: {error}
            </AlertDescription>
          </Alert>
        )}

        {deviceData ? (
          <>
            {/* Map + Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Location Map</CardTitle>
                    <CardDescription>
                      Device position: {deviceData.latitude.toFixed(4)},{" "}
                      {deviceData.longitude.toFixed(4)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="w-full h-96">
                      <DeviceMap
                        latitude={deviceData.latitude}
                        longitude={deviceData.longitude}
                        deviceName={deviceData.device}
                        status={deviceData.status}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Metrics Sidebar */}
              <div className="flex flex-col gap-4">
                {/* Device Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Device Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Device ID</p>
                      <p className="font-mono text-sm font-semibold text-gray-900">
                        {deviceData.device}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge
                        className="mt-1"
                        variant={
                          deviceData.status === "online"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {deviceData.status === "online" ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Update</p>
                      <p className="text-xs text-gray-700 mt-1">
                        {formatTimestamp(deviceData.timestamp)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* CPU Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cpu className="w-5 h-5" />
                      CPU Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gray-900">
                          {deviceData.cpu_percent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(deviceData.cpu_percent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RAM Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      RAM Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="text-lg font-bold text-gray-900">
                          {deviceData.ram_percent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(deviceData.ram_percent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        {deviceData.ram_used_mb.toFixed(2)} MB /{" "}
                        {deviceData.ram_total_mb.toFixed(2)} MB
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* System Log — di bawah map+sidebar */}
            <div className="mt-6">
              <EventLog logs={EventLogs} maxDisplayed={100} />
            </div>

            <div className="mt-6">
              <StatusLog logs={StatusLogs} maxDisplayed={100} />
            </div>
          </>
        ) : isConnecting ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Connecting to MQTT broker...</p>
                </div>
              </CardContent>
            </Card>
            {EventLogs.length > 0 && (
              <EventLog logs={EventLogs} maxDisplayed={100} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <p className="text-gray-600">Waiting for device data</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Topic: {STATUS_TOPIC}
                  </p>
                </div>
              </CardContent>
            </Card>
            {EventLogs.length > 0 && (
              <EventLog logs={EventLogs} maxDisplayed={100} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
