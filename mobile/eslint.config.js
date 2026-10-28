const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
const a11y = require("@studyflash/eslint-plugin-react-native-a11y");
module.exports = defineConfig([
  expo,
  { ignores: ["dist/**", "coverage/**"] },
  {
    files: ["src/**/*.tsx", "App.tsx"],
    ...a11y.configs.flat.android,
    rules: {
      ...a11y.configs.flat.android.rules,
      // React Native labels are sufficient for self-describing controls; hints are optional.
      "react-native-a11y/has-accessibility-hint": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
]);
