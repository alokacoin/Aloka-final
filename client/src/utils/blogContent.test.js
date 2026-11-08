import test from 'node:test';
import assert from 'node:assert/strict';
import { getBlogContentText } from './blogContent.js';

test('article word-count text supports legacy strings and TipTap documents', () => {
  assert.equal(getBlogContentText('A legacy article body.'), 'A legacy article body.');
  assert.equal(getBlogContentText({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'A rich article' }] },
      { type: 'heading', content: [{ type: 'text', text: 'continues here' }] }
    ]
  }), 'A rich article continues here');
  assert.equal(getBlogContentText(null), '');
  assert.equal(getBlogContentText({ type: 'doc', content: 'invalid' }), '');
});
