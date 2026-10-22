// Short links for social media.
// soitalk.app/ig (the Instagram bio link) opens the 2-minute first lesson
// with tracking tags added, so we can see which visitors came from Instagram.
// "permanent: false" means we can change where it points later.

/** @type {import('next').NextConfig} */
module.exports = {
  async redirects() {
    return [
      {
        source: '/ig',
        destination: '/start?utm_source=instagram&utm_medium=social&utm_campaign=bio',
        permanent: false,
      },
    ];
  },
};
