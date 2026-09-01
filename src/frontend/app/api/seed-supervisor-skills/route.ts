import { createClient } from "@/lib/local/supabase-js"
import { LOCAL_USER_ID } from "@/lib/local/constants"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"

const SKILLS = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    dir: "idea-evaluator",
    name: "Idea Evaluator",
    description: "Evaluate research ideas across five dimensions"
  },
  {
    id: "a2222222-2222-2222-2222-222222222222",
    dir: "vibe-research-workflow",
    name: "Vibe Research Guide",
    description: "AI-assisted research workflow guidance"
  },
  {
    id: "a3333333-3333-3333-3333-333333333333",
    dir: "intro-drafter",
    name: "Introduction Drafter",
    description: "Draft high-quality Introduction outlines"
  },
  {
    id: "a8888888-8888-8888-8888-888888888888",
    dir: "literature-review",
    name: "Literature Review Agent",
    description: "Retrieve papers/code and synthesize cited reviews"
  },
  {
    id: "a9999999-9999-9999-9999-999999999999",
    dir: "deep-research",
    name: "Deep Research",
    description: "Survey-grade literature investigation"
  },
  {
    id: "a4444444-4444-4444-4444-444444444444",
    dir: "tech-paper-template",
    name: "Tech Paper Template",
    description: "Structure technical paper logic and skeleton"
  },
  {
    id: "a5555555-5555-5555-5555-555555555555",
    dir: "benchmark-paper-template",
    name: "Benchmark Paper Template",
    description: "Structure benchmark/evaluation paper logic"
  },
  {
    id: "a6666666-6666-6666-6666-666666666666",
    dir: "figure-designer",
    name: "Figure Design Advisor",
    description: "Advise on scientific figure design quality"
  },
  {
    id: "a7777777-7777-7777-7777-777777777777",
    dir: "pre-submission-reviewer",
    name: "Pre-Submission Reviewer",
    description: "Checklist-based pre-submission review"
  },
  {
    id: "abbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    dir: "scientific-feedback",
    name: "Scientific Feedback",
    description: "Peer-review outline feedback for manuscripts"
  },
  {
    id: "accccccc-cccc-cccc-cccc-cccccccccccc",
    dir: "paper-writer",
    name: "Paper Writer",
    description: "Evidence-grounded paper prose drafting"
  },
  {
    id: "addddddd-dddd-dddd-dddd-dddddddddddd",
    dir: "paper-polish",
    name: "Paper Polish",
    description: "Polish academic prose tone and clarity"
  },
  {
    id: "aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    dir: "brainstorm",
    name: "Brainstorm",
    description: "Organize ideas into themes and research questions"
  }
]

export async function POST() {
  try {
    const adminClient = createClient()
    const userId = LOCAL_USER_ID

    const { data: homeWorkspace } = await adminClient
      .from("workspaces")
      .select("id")
      .eq("user_id", userId)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      return NextResponse.json(
        { error: "Home workspace not found" },
        { status: 404 }
      )
    }

    const workspaceId = homeWorkspace.id

    const possibleBaseDirs = [
      path.resolve(process.cwd(), "..", "plugins", "phd-research", "skills"),
      path.resolve(process.cwd(), "plugins", "phd-research", "skills"),
      path.resolve(process.cwd(), "public", "plugins", "phd-research", "skills")
    ]

    let baseDir = ""
    for (const dir of possibleBaseDirs) {
      if (fs.existsSync(dir)) {
        baseDir = dir
        break
      }
    }

    if (!baseDir) {
      return NextResponse.json(
        { error: "Could not locate skills directory" },
        { status: 500 }
      )
    }

    for (const skill of SKILLS) {
      const skillPath = path.join(baseDir, skill.dir, "SKILL.md")
      let prompt = ""
      try {
        prompt = fs.readFileSync(skillPath, "utf-8")
      } catch {
        return NextResponse.json(
          { error: `Skill file not found: ${skill.dir}/SKILL.md` },
          { status: 500 }
        )
      }

      const { error: assistantError } = await adminClient
        .from("assistants")
        .upsert(
          {
            id: skill.id,
            user_id: userId,
            context_length: 4000,
            description: skill.description,
            embeddings_provider: "openai",
            include_profile_context: true,
            include_workspace_instructions: true,
            model: "supervisor-skills",
            name: skill.name,
            image_path: "",
            prompt,
            temperature: 0.5,
            sharing: "private"
          },
          { onConflict: "id" }
        )

      if (assistantError) {
        return NextResponse.json(
          { error: assistantError.message },
          { status: 500 }
        )
      }

      const { error: linkError } = await adminClient
        .from("assistant_workspaces")
        .upsert(
          {
            user_id: userId,
            assistant_id: skill.id,
            workspace_id: workspaceId
          },
          { onConflict: "assistant_id,workspace_id" }
        )

      if (linkError) {
        return NextResponse.json(
          { error: linkError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, count: SKILLS.length })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unexpected error" },
      { status: 500 }
    )
  }
}
