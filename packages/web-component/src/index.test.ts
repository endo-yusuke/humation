import { describe, expect, test } from 'bun:test';
import { humation1 } from '@humation/assets-humation-1';
import { renderAvatarMarkup } from './index.js';

describe('renderAvatarMarkup', () => {
  test('renders deterministic markup without inline color styles', () => {
    const first = renderAvatarMarkup(humation1, { seed: 'felix' });
    const second = renderAvatarMarkup(humation1, { seed: 'felix' });

    expect(first).toBe(second);
    expect(first.startsWith('<svg')).toBe(true);
    // colors come only from the CSS variable cascade + baked fallbacks
    expect(first).not.toContain('style=');
    expect(first).toContain('fill="var(--hm-hair, #000000)"');
    expect(first).toContain('aria-hidden="true"');
  });

  test('selects parts, sizes with aspect ratio, supports title and background', () => {
    const markup = renderAvatarMarkup(humation1, {
      selections: { head: 'braids', item: 'calico-cat' },
      size: 96,
      title: 'Felix <3',
      background: 'transparent',
    });

    expect(markup).toContain('data-part-id="020"');
    expect(markup).toContain('data-group-id="cat"');
    expect(markup).toContain('width="96"');
    expect(markup).toContain('height="96"');
    expect(markup).toContain('<title>Felix &lt;3</title>');
    expect(markup).toContain('role="img"');
    // no background rect when transparent
    expect(markup).not.toContain('fill="#F6F5F4"');
  });
});
