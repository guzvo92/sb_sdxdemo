// Helpers genericos extraidos de sb_satelldex/front/app/utils/generalutils.ts.
// slicetext: trunca un address en formato "abcdef…xyz123" para mostrar en
// tablas de holders sin saturar el ancho.

export function slicetext(s: string | undefined | null, head: number = 6, tail: number = 4): string {
  if (!s) return "—";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
