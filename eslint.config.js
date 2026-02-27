import antfu from '@antfu/eslint-config'
import NuxtEslintConfig from './.nuxt/eslint.config.mjs'

export default antfu(
  {
    // ...@antfu/eslint-config options,
  },
  // Add the Nuxt rules
  NuxtEslintConfig,
  // ...your other rules
)