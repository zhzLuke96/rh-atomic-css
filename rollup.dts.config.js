const dts = require("rollup-plugin-dts").default;
const cjs = require("@rollup/plugin-commonjs").default;
const resolve = require("@rollup/plugin-node-resolve").default;

// only pack dts files
module.exports = [
  {
    input: "./src/main.ts",
    output: [{ file: "./dist/main.d.ts", format: "es" }],
    plugins: [
      resolve(),
      cjs(),
      dts({
        respectExternal: true,
      }),
    ],
    external: [/@rhjs/],
  },
];
