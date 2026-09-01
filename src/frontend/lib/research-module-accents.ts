/**
 * Module identity accents — must NOT reuse semantic status colors
 * (rose/red, amber/yellow, emerald/green) reserved for gates & readiness.
 *
 * Nav order (top → bottom) follows a cool→warm spectral ramp, then
 * neutral critic + finish accent:
 *   overview   teal     — brand hub
 *   literature sky      — search / cool blue
 *   idea       indigo   — insight
 *   experiment violet   — method
 *   writing    fuchsia  — draft / voice
 *   figures    pink     — visual
 *   review     slate    — critic (neutral)
 *   polish     lime     — final shine (not emerald)
 */

import type { ResearchModuleId } from "@/lib/research-modules"

export type ModuleAccent = {
  badge: string
  title: string
  navBrand: string
  navActive: string
  primary: string
  focus: string
  soft: string
  chip: string
  link: string
  outline: string
}

// Explicit full class strings so Tailwind JIT keeps them.
const teal: ModuleAccent = {
  badge:
    "border-teal-500/55 bg-teal-500/20 text-teal-800 dark:border-teal-400/60 dark:bg-teal-400/20 dark:text-teal-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-teal-700 dark:text-teal-300",
  navActive: "bg-teal-600 text-white dark:bg-teal-500 dark:text-white",
  primary: "bg-teal-800 text-white dark:bg-teal-400 dark:text-stone-950",
  focus: "focus:ring-teal-700/30",
  soft: "border-teal-700/25 bg-teal-600/10 dark:border-teal-400/25 dark:bg-teal-400/10",
  chip: "bg-teal-800 text-white dark:bg-teal-400 dark:text-stone-950",
  link: "text-teal-800 dark:text-teal-300",
  outline:
    "border-teal-500/50 text-teal-900 dark:border-teal-300/50 dark:text-teal-200"
}

const sky: ModuleAccent = {
  badge:
    "border-sky-500/55 bg-sky-500/20 text-sky-800 dark:border-sky-400/60 dark:bg-sky-400/20 dark:text-sky-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-sky-700 dark:text-sky-300",
  navActive: "bg-sky-600 text-white dark:bg-sky-500 dark:text-white",
  primary: "bg-sky-800 text-white dark:bg-sky-400 dark:text-stone-950",
  focus: "focus:ring-sky-700/30",
  soft: "border-sky-700/25 bg-sky-600/10 dark:border-sky-400/25 dark:bg-sky-400/10",
  chip: "bg-sky-800 text-white dark:bg-sky-400 dark:text-stone-950",
  link: "text-sky-800 dark:text-sky-300",
  outline:
    "border-sky-500/50 text-sky-950 dark:border-sky-300/50 dark:text-sky-200"
}

const indigo: ModuleAccent = {
  badge:
    "border-indigo-500/55 bg-indigo-500/20 text-indigo-800 dark:border-indigo-400/60 dark:bg-indigo-400/20 dark:text-indigo-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-indigo-700 dark:text-indigo-300",
  navActive: "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white",
  primary: "bg-indigo-800 text-white dark:bg-indigo-400 dark:text-stone-950",
  focus: "focus:ring-indigo-700/30",
  soft: "border-indigo-700/25 bg-indigo-600/10 dark:border-indigo-400/25 dark:bg-indigo-400/10",
  chip: "bg-indigo-800 text-white dark:bg-indigo-400 dark:text-stone-950",
  link: "text-indigo-800 dark:text-indigo-300",
  outline:
    "border-indigo-500/50 text-indigo-950 dark:border-indigo-300/50 dark:text-indigo-200"
}

const violet: ModuleAccent = {
  badge:
    "border-violet-500/55 bg-violet-500/20 text-violet-800 dark:border-violet-400/60 dark:bg-violet-400/20 dark:text-violet-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-violet-700 dark:text-violet-300",
  navActive: "bg-violet-600 text-white dark:bg-violet-500 dark:text-white",
  primary: "bg-violet-800 text-white dark:bg-violet-400 dark:text-stone-950",
  focus: "focus:ring-violet-700/30",
  soft: "border-violet-700/25 bg-violet-600/10 dark:border-violet-400/25 dark:bg-violet-400/10",
  chip: "bg-violet-800 text-white dark:bg-violet-400 dark:text-stone-950",
  link: "text-violet-800 dark:text-violet-300",
  outline:
    "border-violet-500/50 text-violet-950 dark:border-violet-300/50 dark:text-violet-200"
}

const fuchsia: ModuleAccent = {
  badge:
    "border-fuchsia-500/55 bg-fuchsia-500/20 text-fuchsia-800 dark:border-fuchsia-400/60 dark:bg-fuchsia-400/20 dark:text-fuchsia-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-fuchsia-700 dark:text-fuchsia-300",
  navActive: "bg-fuchsia-600 text-white dark:bg-fuchsia-500 dark:text-white",
  primary: "bg-fuchsia-800 text-white dark:bg-fuchsia-400 dark:text-stone-950",
  focus: "focus:ring-fuchsia-700/30",
  soft: "border-fuchsia-700/25 bg-fuchsia-600/10 dark:border-fuchsia-400/25 dark:bg-fuchsia-400/10",
  chip: "bg-fuchsia-800 text-white dark:bg-fuchsia-400 dark:text-stone-950",
  link: "text-fuchsia-800 dark:text-fuchsia-300",
  outline:
    "border-fuchsia-500/50 text-fuchsia-950 dark:border-fuchsia-300/50 dark:text-fuchsia-200"
}

const pink: ModuleAccent = {
  badge:
    "border-pink-500/55 bg-pink-500/20 text-pink-800 dark:border-pink-400/60 dark:bg-pink-400/20 dark:text-pink-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-pink-700 dark:text-pink-300",
  navActive: "bg-pink-600 text-white dark:bg-pink-500 dark:text-white",
  primary: "bg-pink-800 text-white dark:bg-pink-400 dark:text-stone-950",
  focus: "focus:ring-pink-700/30",
  soft: "border-pink-700/25 bg-pink-600/10 dark:border-pink-400/25 dark:bg-pink-400/10",
  chip: "bg-pink-800 text-white dark:bg-pink-400 dark:text-stone-950",
  link: "text-pink-800 dark:text-pink-300",
  outline:
    "border-pink-500/50 text-pink-950 dark:border-pink-300/50 dark:text-pink-200"
}

const slate: ModuleAccent = {
  badge:
    "border-slate-400/55 bg-slate-500/20 text-slate-800 dark:border-slate-300/55 dark:bg-slate-400/20 dark:text-slate-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-slate-600 dark:text-slate-300",
  navActive: "bg-slate-600 text-white dark:bg-slate-500 dark:text-white",
  primary: "bg-slate-800 text-white dark:bg-slate-300 dark:text-slate-950",
  focus: "focus:ring-slate-600/30",
  soft: "border-slate-500/30 bg-slate-500/10 dark:border-slate-400/25 dark:bg-slate-400/10",
  chip: "bg-slate-800 text-white dark:bg-slate-300 dark:text-slate-950",
  link: "text-slate-800 dark:text-slate-300",
  outline:
    "border-slate-400/60 text-slate-900 dark:border-slate-300/50 dark:text-slate-200"
}

const lime: ModuleAccent = {
  badge:
    "border-lime-500/55 bg-lime-500/20 text-lime-900 dark:border-lime-400/60 dark:bg-lime-400/20 dark:text-lime-300",
  title: "text-stone-900 dark:text-white/95",
  navBrand: "text-lime-700 dark:text-lime-300",
  navActive: "bg-lime-600 text-white dark:bg-lime-500 dark:text-stone-950",
  primary: "bg-lime-800 text-white dark:bg-lime-400 dark:text-stone-950",
  focus: "focus:ring-lime-700/30",
  soft: "border-lime-700/25 bg-lime-600/10 dark:border-lime-400/25 dark:bg-lime-400/10",
  chip: "bg-lime-800 text-white dark:bg-lime-400 dark:text-stone-950",
  link: "text-lime-800 dark:text-lime-300",
  outline:
    "border-lime-500/50 text-lime-950 dark:border-lime-300/50 dark:text-lime-200"
}

export const MODULE_ACCENTS: Record<ResearchModuleId, ModuleAccent> = {
  overview: teal,
  literature: sky,
  idea: indigo,
  experiment: violet,
  writing: fuchsia,
  figures: pink,
  review: slate,
  polish: lime
}

export function moduleAccent(id: ResearchModuleId): ModuleAccent {
  return MODULE_ACCENTS[id]
}
