module.exports = {
  recursive: true,
  import: 'tsx',
  'watch-files': ['src/test/**/*.spec.ts', 'src/test/**/*.ts'],
  spec: 'src/test/**/*.spec.ts',
  timeout: 5000, // debug session
};
