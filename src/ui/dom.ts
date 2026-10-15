export function setText(root: ParentNode, selector: string, value: string): void {
  const element = root.querySelector(selector);
  if (element && element.textContent !== value) element.textContent = value;
}

export function setData(root: ParentNode, selector: string, key: string, value: string): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (element && element.dataset[key] !== value) element.dataset[key] = value;
}

export function setFlag(element: HTMLElement, key: string, value: boolean): void {
  if (element.dataset[key] !== String(value)) element.dataset[key] = String(value);
}
