import { formatCurrency, formatNumber } from '../utils/formatting';

export function niceScale(maxValue: number, tickCount: number): { max: number; step: number; ticks: number[] } {
  if (maxValue <= 0) {
    return { max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
  }

  const roughStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = 1 * magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMax = Math.ceil(maxValue / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax; v += niceStep) {
    ticks.push(v);
  }

  return { max: niceMax, step: niceStep, ticks };
}

export function formatAxisLabel(value: number, isCurrency: boolean): string {
  return isCurrency ? formatCurrency(value) : formatNumber(value);
}
