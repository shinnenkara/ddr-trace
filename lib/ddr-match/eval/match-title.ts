import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { cosineSimilarity, embed, embedMany, generateObject } from "ai";
import { z } from "zod";
import type { TitleCandidate } from "../ai-results-schema";
import { EVAL_EMBED_MODEL, EVAL_LITE_MODEL } from "./eval-models";

export const TITLE_PASS_THRESHOLD = 0.92;
export const TITLE_PARTIAL_THRESHOLD = 0.85;
const TIE_BREAK_MARGIN = 0.03;

export type TitleMatchResult = {
  pass: boolean;
  score: number;
  bestCandidate: string | null;
  similarity: number;
  usedTieBreak: boolean;
};

export type TitleMatcher = (
  goldenTitle: string,
  candidates: TitleCandidate[],
) => Promise<TitleMatchResult>;

function normalizeTitle(value: string): string {
  return value.normalize("NFC").toLowerCase().trim();
}

function scoreFromSimilarity(similarity: number): number {
  if (similarity >= TITLE_PASS_THRESHOLD) {
    return 1;
  }
  if (similarity >= TITLE_PARTIAL_THRESHOLD) {
    return 0.5;
  }
  return 0;
}

export function createEmbeddingTitleMatcher(apiKey: string): TitleMatcher {
  const google = createGoogleGenerativeAI({ apiKey });

  return async (goldenTitle, candidates) => {
    const titles = candidates
      .map((candidate) => candidate.title.trim())
      .filter((title) => title.length > 0);

    if (titles.length === 0) {
      return {
        pass: false,
        score: 0,
        bestCandidate: null,
        similarity: 0,
        usedTieBreak: false,
      };
    }

    const exactIndex = titles.findIndex(
      (title) => normalizeTitle(title) === normalizeTitle(goldenTitle),
    );
    if (exactIndex >= 0) {
      return {
        pass: true,
        score: 1,
        bestCandidate: titles[exactIndex],
        similarity: 1,
        usedTieBreak: false,
      };
    }

    const { embedding: goldenEmbedding } = await embed({
      model: google.embedding(EVAL_EMBED_MODEL),
      value: goldenTitle,
    });

    const { embeddings } = await embedMany({
      model: google.embedding(EVAL_EMBED_MODEL),
      values: titles,
    });

    let bestIndex = 0;
    let bestSimilarity = cosineSimilarity(goldenEmbedding, embeddings[0]);

    for (let index = 1; index < embeddings.length; index++) {
      const similarity = cosineSimilarity(goldenEmbedding, embeddings[index]);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIndex = index;
      }
    }

    let usedTieBreak = false;
    let finalSimilarity = bestSimilarity;

    const sortedSimilarities = embeddings
      .map((vector, index) => ({
        index,
        similarity: cosineSimilarity(goldenEmbedding, vector),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const runnerUp = sortedSimilarities[1];
    if (
      runnerUp &&
      bestSimilarity - runnerUp.similarity <= TIE_BREAK_MARGIN &&
      bestSimilarity < TITLE_PASS_THRESHOLD
    ) {
      const { object } = await generateObject({
        model: google(EVAL_LITE_MODEL),
        schema: z.object({
          equivalent: z.boolean(),
          score: z.number().min(0).max(1),
        }),
        prompt: `Are these two DDR song titles the same song (OCR/romanization variants OK)?

Expected: "${goldenTitle}"
Candidate: "${titles[bestIndex]}"

Return equivalent=true only when they clearly refer to the same song.`,
        temperature: 0,
      });

      usedTieBreak = true;
      if (object.equivalent) {
        finalSimilarity = Math.max(bestSimilarity, object.score);
      }
    }

    const score = scoreFromSimilarity(finalSimilarity);

    return {
      pass: score >= 0.5,
      score,
      bestCandidate: titles[bestIndex],
      similarity: finalSimilarity,
      usedTieBreak,
    };
  };
}

/** Deterministic matcher for unit tests — string equality and substring only. */
export function createExactTitleMatcher(): TitleMatcher {
  return async (goldenTitle, candidates) => {
    const normalizedGolden = normalizeTitle(goldenTitle);
    const titles = candidates.map((candidate) => candidate.title.trim());

    const top1 = titles[0];
    if (top1 && normalizeTitle(top1) === normalizedGolden) {
      return {
        pass: true,
        score: 1,
        bestCandidate: top1,
        similarity: 1,
        usedTieBreak: false,
      };
    }

    const inTop3 = titles.slice(0, 3).some(
      (title) => normalizeTitle(title) === normalizedGolden,
    );
    if (inTop3) {
      const match = titles.find(
        (title) => normalizeTitle(title) === normalizedGolden,
      );
      return {
        pass: true,
        score: 0.5,
        bestCandidate: match ?? top1 ?? null,
        similarity: 0.9,
        usedTieBreak: false,
      };
    }

    return {
      pass: false,
      score: 0,
      bestCandidate: top1 ?? null,
      similarity: 0,
      usedTieBreak: false,
    };
  };
}
