import { describe,it,expect } from 'vitest'; import { categoryFromText } from '@tryon/shared';
describe('detection helpers',()=>it('categorizes product names',()=>expect(categoryFromText('Classic Necklace')).toBe('jewelry')));
