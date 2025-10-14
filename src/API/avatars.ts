import api from ".";

interface AvatarLoader {
  loader: Promise<string>;
  url: string;
}

export const avatars: { [steamid: string]: AvatarLoader } = {};

export const loadAvatarURL = (steamid: string) => {
  if (!steamid) return;
  if (avatars[steamid]) return avatars[steamid].url;

  avatars[steamid] = {
    url: "",
    loader: new Promise((resolve) => {
      api.players
        .getAvatarURLs(steamid)
        .then((result) => {
          avatars[steamid].url = result.custom || result.steam;
          resolve(result.custom || result.steam);
        })
        .catch(() => {
          delete avatars[steamid];
          resolve("");
        });
    }),
  };

  return undefined;
};
