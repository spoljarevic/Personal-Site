/**
 * Site configuration
 * Edit these values to customize your personal site
 */
const CONFIG = {
  // Codeberg API base (use Cloudflare Worker proxy URL if CORS blocks direct calls)
  CODEBERG_API: 'https://codeberg.org/api/v1',
  RAW_CODEBERG: 'https://raw.codeberg.org',

  // Repos for projects
  REPOS: {
    personal: { owner: 'Spoljarevic', label: 'Personal Projects' },
    company: { owner: 'Who2Industries', label: 'Who2Industries' },
  },

  // Git activity - Ansible repo (master + development)
  GIT_ACTIVITY: {
    owner: 'Spoljarevic',
    repo: 'Ansible',
    branches: ['master', 'development'],
  },

  // Blog
  BLOG: {
    owner: 'Spoljarevic',
    repo: 'Blog',
    branch: 'master',
    // Fallback post list if API listing fails (update when adding posts)
    fallbackPosts: [
      '2026-02-10 - Chess journey',
      '2026-01-06 - My new Blog',
    ],
  },

  // Profile
  PROFILE: {
    name: 'Luca Matteo Špoljarević',
    title: 'Linux Sysadmin | IT Specialist',
    bio: 'IT Specialist for System Integration | Linux Sysadmin | Developer | Founder @ Who2Industries',
    image: 'images/profiles/ls.jpg',
  },

  // Links
  LINKS: [
    { href: 'https://socials.spoljarevic.sh', label: 'All Links', icon: '🔗' },
    { href: 'https://donate.spoljarevic.sh', label: 'Donate', icon: '♥' },
    { href: 'https://codeberg.org/Spoljarevic', label: 'Codeberg', icon: '📦' },
    { href: 'https://techhub.social/@spoljarevic', label: 'TechHub (Mastodon)', icon: '🐘' },
  ],
};

