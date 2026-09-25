import test from 'node:test'; import assert from 'node:assert/strict'; import { categoryFromText } from '@tryon/shared';
test('classifies a jewelry product',()=>assert.equal(categoryFromText('Classic Necklace'), 'jewelry'));
