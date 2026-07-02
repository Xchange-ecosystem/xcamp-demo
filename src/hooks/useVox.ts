import { voxFetch } from "@/integrations/vox/client";
import type { AnswerWithContextRequest, AnswerWithContextResponse } from "@xchange/client";

export function useVox() {
  const call = async (req: AnswerWithContextRequest): Promise<AnswerWithContextResponse> => {
    const res = await voxFetch("/answer-with-context", {
      method: "POST",
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`[Vox] /answer-with-context → ${res.status}`);
    return res.json() as Promise<AnswerWithContextResponse>;
  };

  return { call };
}
