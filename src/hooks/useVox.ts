import { useCallback, useMemo } from "react";
import { voxFetch } from "@/integrations/vox/client";
import type { AnswerWithContextRequest, AnswerWithContextResponse } from "@xchange/client";

type VoxCallRequest = AnswerWithContextRequest & { referenced_entity_ids?: string[] };

export function useVox() {
  const call = useCallback(async (req: VoxCallRequest): Promise<AnswerWithContextResponse> => {
    const res = await voxFetch("/api/answer-with-context", {
      method: "POST",
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`[Vox] /answer-with-context → ${res.status}`);
    return res.json() as Promise<AnswerWithContextResponse>;
  }, []);

  return useMemo(() => ({ call }), [call]);
}
