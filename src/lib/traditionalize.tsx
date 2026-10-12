import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { toTraditional } from './traditionalize-text';

export { toTraditional } from './traditionalize-text';

export function traditionalize(node: ReactNode, preserve: string[] = []): ReactNode {
  if (typeof node === 'string') return toTraditional(node, preserve);
  if (typeof node === 'number' || node == null || typeof node === 'boolean') return node;
  if (Array.isArray(node)) return Children.map(node, (item) => traditionalize(item, preserve));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props = { ...element.props };
  for (const key of ['aria-label', 'title', 'placeholder', 'alt']) {
    if (typeof props[key] === 'string') props[key] = toTraditional(props[key] as string, preserve);
  }
  return cloneElement(element, props, traditionalize(element.props.children as ReactNode, preserve));
}
