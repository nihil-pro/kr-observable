/**
 * @docs: https://github.com/okonet/lint-staged
 *
 * Runs commands for files added to commit
 *
 */

export default {
  '(*.js|*.ts|*.cjs|*.mjs)': ['npm run format:js'],
};
