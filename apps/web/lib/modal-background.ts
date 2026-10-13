type ModalState = {
  owners: { modal: HTMLElement }[];
  changed: Map<HTMLElement, boolean>;
  overflow: string;
  overflowPriority: string;
  observer: MutationObserver;
  refresh: () => void;
};
const modalStates = new WeakMap<Document, ModalState>();

export function isActiveModal(modal: HTMLElement): boolean {
  const doc = modal.ownerDocument;
  return modalStates.get(doc)?.owners.findLast((owner) => doc.body.contains(owner.modal))?.modal === modal;
}

// One owner stack per document; only the newest connected modal is interactive.
export function isolateModalBackground(modal: HTMLElement): () => void {
  const doc = modal.ownerDocument;
  if (!doc.body.contains(modal) || modal === doc.body) return () => {};
  let state = modalStates.get(doc);
  if (!state) {
    const changed = new Map<HTMLElement, boolean>();
    const owners: ModalState['owners'] = [];
    const refresh = () => {
      for (const [element, inert] of changed) element.inert = inert;
      changed.clear();
      const active = owners.findLast((owner) => doc.body.contains(owner.modal));
      let branch: HTMLElement | null = active?.modal ?? null;
      while (branch?.parentElement) {
        for (const sibling of Array.from(branch.parentElement.children)) {
          if (!(sibling instanceof doc.defaultView!.HTMLElement) || sibling === branch) continue;
          changed.set(sibling, sibling.inert);
          sibling.inert = true;
        }
        branch = branch.parentElement;
        if (branch === doc.body) break;
      }
    };
    const observer = new MutationObserver(refresh);
    state = { owners, changed, refresh, observer, overflow: doc.body.style.overflow,
      overflowPriority: doc.body.style.getPropertyPriority('overflow') };
    modalStates.set(doc, state);
    observer.observe(doc.body, { childList: true, subtree: true });
  }
  const owner = { modal };
  state.owners.push(owner);
  state.refresh();
  doc.body.style.overflow = 'hidden';
  const ownedState = state;
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    ownedState.owners.splice(ownedState.owners.indexOf(owner), 1);
    if (ownedState.owners.length) { ownedState.refresh(); return; }
    ownedState.observer.disconnect();
    for (const [element, inert] of ownedState.changed) element.inert = inert;
    doc.body.style.setProperty('overflow', ownedState.overflow, ownedState.overflowPriority);
    modalStates.delete(doc);
  };
}
