import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import type { PageData } from './types';
export { graphFor } from './model';
export function render(data: PageData) {
  return renderToString(<App data={data} />);
}
