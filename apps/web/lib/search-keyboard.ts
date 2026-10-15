export function moveSearchFocus(event: KeyboardEvent, dialog: HTMLElement, input: HTMLInputElement): boolean {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
    !['ArrowDown', 'ArrowUp'].includes(event.key)) return false;
  const links = Array.from(dialog.querySelectorAll<HTMLAnchorElement>('a[data-search-result]'));
  const active = dialog.ownerDocument.activeElement;
  const index = links.findIndex((link) => link === active);
  if (!links.length || (active !== input && index < 0)) return false;
  const target = active === input ? (event.key === 'ArrowDown' ? links[0] : links.at(-1)) :
    event.key === 'ArrowDown' ? links[index + 1] ?? input : links[index - 1] ?? input;
  event.preventDefault();
  target?.focus();
  return true;
}
