import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Next 16 ships these as flat configs. FlatCompat cannot load them. */
const eslintConfig = [...nextVitals, ...nextTs];

export default eslintConfig;
