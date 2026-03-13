import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCustomerBaseUrl() {
  if (typeof window === 'undefined') return '';
  const host = window.location.host.replace('admin-', '').replace('admin.', '');
  if (host.includes('localhost') || host.includes('127.0.0')) return `${window.location.protocol}//${host}`;
  return `https://customer-coiffureticket.vercel.app`;
}
