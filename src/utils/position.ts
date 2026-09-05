export function computePosition(prevPosition: number | null, nextPosition: number | null): number {
  if (prevPosition === null && nextPosition === null) {
    return 1000;
  }
  if (prevPosition === null && nextPosition !== null) {
    return nextPosition > 2 ? nextPosition / 2 : nextPosition - 1000;
  }
  if (prevPosition !== null && nextPosition === null) {
    return prevPosition + 1000;
  }
  return (prevPosition! + nextPosition!) / 2;
}