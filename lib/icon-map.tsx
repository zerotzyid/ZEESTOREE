'use client';

import {
  Server,
  Box,
  HardDrive,
  Cpu,
  Database,
  ExternalLink,
  ShieldCheck,
  Home,
  BarChart3,
  Package,
  ReceiptText,
  ScrollText,
  Users,
  Settings,
  Ticket,
  QrCode,
} from 'lucide-react';

export const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Server,
  Box,
  HardDrive,
  Cpu,
  Database,
  ExternalLink,
  ShieldCheck,
  Home,
  BarChart3,
  Package,
  ReceiptText,
  ScrollText,
  Users,
  Settings,
  Ticket,
  QrCode,
};

interface LucideIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function LucideIcon({ name = 'Server', size, ...props }: LucideIconProps) {
  const Icon = iconMap[name] || Server;
  return <Icon {...props} width={size} height={size} />;
}