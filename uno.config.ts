import { defineConfig } from 'unocss'
import { transformerDirectives } from 'unocss'

export default defineConfig({
   transformers: [
    transformerDirectives({
        applyVariable: ['--at-apply', '--uno-apply', '--uno'],
    }),
  ],
})