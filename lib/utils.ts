// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Tailwind-friendly class name helper that collapses duplicates.

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
