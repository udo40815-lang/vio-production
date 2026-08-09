import React from 'react';
import { gradientStyle } from '../../utils/design-system.js';
import VioMark from '../ui/VioMark.jsx';

function PostGradientMedia({ post }) {
  const seed = ((post.id || '') + '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return <div className="relative overflow-hidden w-full" style={{ aspectRatio: '4/5', ...gradientStyle((seed % 180) + 60) }}><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(800px 500px at 30% 30%, rgba(255,255,255,0.18), transparent 55%)' }} /><div className="absolute inset-0 flex items-center justify-center"><VioMark size={80} color="rgba(255,255,255,0.88)" /></div></div>;
}


export default PostGradientMedia;
