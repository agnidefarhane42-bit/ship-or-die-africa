import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const repo = searchParams.get("repo");

    if (!username || !repo) {
      return NextResponse.json({ error: "Missing username or repo" }, { status: 400 });
    }

    const token = process.env.GITHUB_ACCESS_TOKEN;
    const headers: HeadersInit = {
      "Accept": "application/vnd.github+json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/repos/${username}/${repo}/commits?per_page=10`,
      { headers, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Repo not found" }, { status: 404 });
    }

    const commits = await res.json();
    
    const formatted = commits.map((c: any) => ({
      sha: c.sha?.substring(0, 7),
      message: c.commit?.message?.split("\n")[0],
      date: c.commit?.author?.date,
      author: c.commit?.author?.name,
    }));

    return NextResponse.json({ commits: formatted });
  } catch (err) {
    console.error("GitHub commits error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
