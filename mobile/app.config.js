const fs = require("fs");
const path = require("path");

function readLocalEnvValue(file, name) {
  try {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = fs
      .readFileSync(file, "utf8")
      .match(new RegExp(`^${escapedName}=(.+)$`, "m"));
    return match?.[1].trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

module.exports = ({ config }) => {
  const mapsKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY ??
    process.env.GOOGLE_MAPS_API_KEY ??
    readLocalEnvValue(
      path.resolve(process.cwd(), ".env.local"),
      "GOOGLE_MAPS_ANDROID_API_KEY",
    ) ??
    readLocalEnvValue(
      path.resolve(process.cwd(), ".env.local"),
      "GOOGLE_MAPS_API_KEY",
    ) ??
    readLocalEnvValue(
      path.resolve(process.cwd(), "..", ".env.local"),
      "GOOGLE_MAPS_ANDROID_API_KEY",
    ) ??
    readLocalEnvValue(
      path.resolve(process.cwd(), "..", ".env.local"),
      "GOOGLE_MAPS_API_KEY",
    );
  return {
    ...config,
    android: {
      ...config.android,
      ...(mapsKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: { apiKey: mapsKey },
            },
          }
        : {}),
    },
  };
};
