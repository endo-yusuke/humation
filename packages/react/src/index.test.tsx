import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { humation1 } from '@humation/assets-humation-1';
import { Avatar } from './index.js';

describe('<Avatar>', () => {
  test('renders a deterministic seeded avatar', () => {
    const first = renderToStaticMarkup(
      <Avatar assets={humation1} seed="felix" />
    );
    const second = renderToStaticMarkup(
      <Avatar assets={humation1} seed="felix" />
    );

    expect(first).toBe(second);
    expect(first.startsWith('<svg')).toBe(true);
    expect(first).toContain('viewBox="-4 -4.5 88 88"');
    expect(first).toContain('fill="var(--hm-hair, #000000)"');
    expect(first).toContain('aria-hidden="true"');
  });

  test('selects parts by name and applies colors as CSS variables', () => {
    const html = renderToStaticMarkup(
      <Avatar
        assets={humation1}
        selections={{ head: 'braids', item: 'calico-cat' }}
        colors={{ hair: '4A3728', skin: '#F4C9A8' }}
        title="Felix"
      />
    );

    expect(html).toContain('data-hm-part-id="hm1-p-000020"'); // braids
    expect(html).toContain('data-hm-source-part-id="020"');
    expect(html).toContain('data-hm-selection-slot="item"');
    expect(html).toContain('data-hm-part-id="hm1-p-000068"'); // calico-cat
    expect(html).toContain('data-hm-source-group-id="cat"');
    expect(html).toContain('--hm-hair:#4A3728');
    expect(html).toContain('--hm-skin:#F4C9A8');
    expect(html).toContain('<title>Felix</title>');
    expect(html).toContain('role="img"');
  });

  test('colors do not change the rendered content markup', () => {
    const extract = (html: string) =>
      html.slice(html.indexOf('<g>'), html.lastIndexOf('</g>'));

    const a = renderToStaticMarkup(
      <Avatar assets={humation1} seed="felix" colors={{ hair: '111111' }} />
    );
    const b = renderToStaticMarkup(
      <Avatar assets={humation1} seed="felix" colors={{ hair: 'EEEEEE' }} />
    );

    expect(extract(a)).toBe(extract(b));
    expect(a).toContain('--hm-hair:#111111');
    expect(b).toContain('--hm-hair:#EEEEEE');
  });

  test('size keeps the crop aspect ratio and background can be transparent', () => {
    const html = renderToStaticMarkup(
      <Avatar assets={humation1} seed="x" size={96} background="transparent" />
    );

    expect(html).toContain('width="96"');
    expect(html).toContain('height="96"');
    // no background rect when transparent
    expect(html).not.toContain('fill="#F6F5F4"');
  });
});
