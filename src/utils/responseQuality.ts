export interface ResponseQuality {
  medianMs: number;
  tooFastCount: number;
  straightLineRatio: number;
  flag: 'ok' | 'low_confidence';
}

const TOO_FAST_MS = 800;

export function computeResponseQuality(
  answerTimesMs: number[],
  answerValues: number[],
): ResponseQuality {
  if (answerTimesMs.length === 0) {
    return { medianMs: 0, tooFastCount: 0, straightLineRatio: 0, flag: 'ok' };
  }

  const sorted = [...answerTimesMs].sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const tooFastCount = answerTimesMs.filter(t => t < TOO_FAST_MS).length;

  const freq: Record<number, number> = {};
  for (const v of answerValues) freq[v] = (freq[v] ?? 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  const straightLineRatio = answerValues.length > 0 ? maxFreq / answerValues.length : 0;

  const flag: ResponseQuality['flag'] =
    (tooFastCount > answerTimesMs.length * 0.5 && answerTimesMs.length > 3) ||
    (medianMs < TOO_FAST_MS && answerTimesMs.length > 3) ||
    (straightLineRatio >= 0.9 && answerValues.length > 5)
      ? 'low_confidence'
      : 'ok';

  return { medianMs, tooFastCount, straightLineRatio, flag };
}
