import type { AnswerWithContextRequest, AnswerWithContextResponse } from '../types/ai';
import { voxAuthFetch, type TokenProvider } from './client';

export async function answerWithContext(
  req: AnswerWithContextRequest,
  getToken: TokenProvider,
): Promise<AnswerWithContextResponse> {
  return voxAuthFetch<AnswerWithContextResponse>(
    '/answer-with-context',
    req as unknown as Record<string, unknown>,
    getToken,
  );
}
