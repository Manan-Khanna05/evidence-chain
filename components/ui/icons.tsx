"use client";

/**
 * The supplied V2 icons under the names the codebase already used.
 *
 * Each export draws the matching icon from public/assets/icons through RailIcon,
 * so navigation, actions and status share one icon family. Icons with no
 * supplied equivalent are still imported from lucide-react where they are used.
 */

import * as React from "react";
import { RailIcon, type RailIconName } from "@/components/ui/rail-icon";

type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
};

function make(name: RailIconName, display: string) {
  const Icon = ({ size = 24, strokeWidth, className, style, "aria-label": label }: IconProps) => (
    <RailIcon name={name} size={size} strokeWidth={strokeWidth} className={className} style={style} title={label} />
  );
  Icon.displayName = display;
  return Icon;
}

export const AlertTriangle = make("warning", "AlertTriangle");
export const Anchor = make("anchor", "Anchor");
export const ArrowLeftRight = make("handoff", "ArrowLeftRight");
export const Bell = make("notifications", "Bell");
export const BookOpen = make("guide", "BookOpen");
export const Calendar = make("calendar", "Calendar");
export const Camera = make("capture", "Camera");
export const Check = make("check", "Check");
export const ChevronDown = make("chevron-down", "ChevronDown");
export const ChevronRight = make("chevron-right", "ChevronRight");
export const Clock = make("clock", "Clock");
export const Clock3 = make("clock", "Clock3");
export const Cloud = make("cloud", "Cloud");
export const CloudUpload = make("pending-sync", "CloudUpload");
export const Cpu = make("pramaan", "Cpu");
export const FileBadge = make("certificates", "FileBadge");
export const Filter = make("filter", "Filter");
export const FlaskConical = make("field-test", "FlaskConical");
export const FolderOpen = make("cases", "FolderOpen");
export const KeyRound = make("lock", "KeyRound");
export const Layers = make("system-guide", "Layers");
export const LayoutDashboard = make("dashboard", "LayoutDashboard");
export const Lock = make("lock", "Lock");
export const MapPin = make("location", "MapPin");
export const Menu = make("menu", "Menu");
export const MonitorPlay = make("demo-mode", "MonitorPlay");
export const PlayCircle = make("replay", "PlayCircle");
export const Plus = make("plus", "Plus");
export const QrCode = make("qr", "QrCode");
export const Search = make("search", "Search");
export const ShieldAlert = make("shield", "ShieldAlert");
export const ShieldCheck = make("verification", "ShieldCheck");
export const Smartphone = make("device-status", "Smartphone");
export const Sparkles = make("whats-new", "Sparkles");
export const Train = make("train", "Train");
export const TriangleAlert = make("warning", "TriangleAlert");
export const UploadCloud = make("pending-sync", "UploadCloud");
export const User = make("user", "User");
export const UserRound = make("user", "UserRound");
export const Wrench = make("settings", "Wrench");
export const X = make("close", "X");
