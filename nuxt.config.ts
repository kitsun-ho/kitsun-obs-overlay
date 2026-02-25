export default defineNuxtConfig({
  devtools: { enabled: false },
  typescript: {
    strict: true,
    typeCheck: true
  },
  nitro: {
    compatibilityDate: '2024-10-01'
  }
})
