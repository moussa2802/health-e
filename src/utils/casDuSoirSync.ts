/** Le dernier élément commencé à l'instant t (-1 avant le premier) : la phrase ou l'image en cours d'un minutage. */
export function indexA<T>(list: T[], t: number, debut: (x: T) => number): number {
  let i = -1;
  for (let k = 0; k < list.length; k += 1) { if (debut(list[k]) <= t + 0.05) i = k; else break; }
  return i;
}
