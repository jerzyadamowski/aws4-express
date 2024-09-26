module.exports = {
  recursive: true,
  import: 'tsx',
  'watch-files': ['src/tests/**/*.spec.ts', 'src/tests/**/*.ts'],
  spec: 'src/tests/**/*.spec.ts',
  timeout: 5000, // debug session
};
