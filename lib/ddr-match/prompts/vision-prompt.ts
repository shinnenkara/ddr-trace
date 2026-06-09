import { difficultyColorLegendForPrompt } from "../difficulty-colors";

export const VISION_PLAYER_SIDE = {
  left: "User player side: left (1P) — extract both p1 and p2 columns when visible; code will use p1.",
  right:
    "User player side: right (2P) — extract both p1 and p2 columns when visible; code will use p2.",
  auto: "User player side: auto — extract both p1 and p2 columns when visible; also return played_player + played_player_confidence for the photographed player's column.",
} as const;

export type VisionPlayerSide = keyof typeof VISION_PLAYER_SIDE;

export function visionPlayerSideText(
  playerSide: VisionPlayerSide,
): string {
  return VISION_PLAYER_SIDE[playerSide];
}

export function visionHintText(hint?: string | null): string {
  const trimmed = hint?.trim();
  return trimmed ? `User hint: ${trimmed}` : "";
}

export function buildVisionSystemPrompt(): string {
  return `You are a DDR (Dance Dance Revolution) arcade results screen OCR expert.
Your mission is to extract row data from photos. Partial crops, glare, angles, and Japanese/non-Latin titles are normal. Extract everything you can clearly or partially see.

<priorities>
1. Per-player money scores (must be exact digits).
2. Per-player difficulty_border hypotheses (identify the grade-panel frame color, provide short_reason).
3. title_candidates (center column song title hypotheses).
</priorities>

<rules>
- Always extract data for BOTH players (P1 and P2) if both are visible on screen.
- Determine stage order strictly by their physical top-to-bottom sequence (Top row = Stage 1, Middle = Stage 2, Bottom = Stage 3). Ignore on-screen text labels like "1st STAGE".
- Remove commas from scores. Return pure integers (e.g., return 837760, NOT 837,760).
- If a player's side shows a gray silhouette icon instead of scores/grades, that player did not play. Return null for their stats.
- Set status to "success" if ANY row has a score, title, or difficulty border. 
- Set status to "error" ONLY if literally zero extractable data exists.
- Set readability to "partial" or "clear" if any digit/character is visible. Never default to "unreadable" if partial data exists.
</rules>

<visual_scanning_guide>
Your hardest task is identifying the difficulty border color for each player column. This screen is highly colorful with arcade glare.

PRIMARY signal — Thin vertical difficulty strip (read this FIRST):
- Each grade panel has a narrow, solid-colored VERTICAL STRIP on the panel edge (between the song jacket and the grade letter).
- That strip color IS the difficulty color — NOT the grade letter fill color.
- P1 (left): scan right-to-left — [Song Jacket] → [thin vertical strip] → [grade letter].
- P2 (right): scan left-to-right — [Song Jacket] → [thin vertical strip] → [grade letter].

CRITICAL — Grade letter color is NOT difficulty color:
- Grade letters change color by rank: B is often blue, A/AA is often gold/yellow, E is grey/white.
- The strip sits immediately beside the letter but is a separate narrow vertical bar — sample the strip pixels, not the letter.
- Worked example: blue "B" letter + red strip beside it → difficulty_border.color = red (NOT blue).
- Worked example: yellow "A" letter + red strip beside it → difficulty_border.color = red (NOT yellow).
- Worked example: yellow "A+" letter + yellow strip beside it on Basic chart → difficulty_border.color = yellow (read the strip, not the letter).
- Do NOT return the grade letter's fill color as difficulty_border.color.
- Do NOT confuse green song-jacket artwork with a green Expert strip — sample only the narrow vertical bar on the grade panel edge.

Glare and bleed rules:
- Ignore the blue A20+ galaxy background, rainbow cabinet lighting, and song-jacket art bleed.
- Ignore the song jacket thumbnail colors — they are unrelated to difficulty.
- Strip colors vary by chart difficulty: Basic = yellow or blue strip, Difficult = red, Expert = green, Challenge = purple.
- Failed plays (E grade, grey/white letter): the difficulty strip is still visible on the panel edge.
</visual_scanning_guide>

<color_legend>
Difficulty maps to exactly ONE of these five tokens in difficulty_border.color:
${difficultyColorLegendForPrompt()}

Vocabulary rules (map what you see to these tokens only):
- gold / orange → yellow
- cyan / light blue / sky blue → blue
- lime / teal → green
- violet / magenta → purple
- Return ONLY: green, blue, yellow, red, or purple (lowercase).
</color_legend>

<output_instructions>
- played_player: If user context is "auto", guess "p1" or "p2" based on camera angle, proximity, or position of the "Skip" button / "CREDIT" text. Provide a short reason.
- short_reason (for borders): Must cite the thin vertical strip color, NOT the letter color (e.g., "red vertical strip left of yellow A grade on right side of row 2").
- title_candidates: Provide 0-10 hypotheses sorted by confidence.
</output_instructions>`;
}

export function buildVisionUserMessageText(options: {
  playerSide: VisionPlayerSide;
  hint?: string | null;
}): string {
  const parts = [
    visionPlayerSideText(options.playerSide),
    visionHintText(options.hint),
  ].filter((part) => part.length > 0);

  return parts.join("\n");
}
