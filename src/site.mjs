// Site-wide settings. Everything that names the site lives here.
export const SITE = {
  name: 'Sign of Nine',
  url: 'https://signofnine.com',
  tagline: 'Numerology, angel numbers and life path meanings, explained simply',
  shortTagline: 'Numerology, explained simply',
  description:
    'Angel number meanings, a life path calculator and plain-English numerology guides, with the working shown and the tradition named.',
  author: 'Ayush Sondhi',
  email: 'hello@signofnine.com',
  locale: 'en_US',
  launched: '2026-10-17',
  indexNowKey: '7c3f4e9a2b8d4f1e9a6c0b5d8e2f7a13',
  // The code Pinterest gives when the website is claimed ("Add HTML tag"); written into a p:domain_verify meta tag when set.
  pinterestVerify: '',
  legalLine: 'For reflection and entertainment. Not a substitute for professional advice.',
  system: 'Pythagorean system',
  ads: false,
};

export const NAV = [
  { label: 'Home', href: '/', key: 'home' },
  { label: 'Angel numbers', href: '/angel-numbers/', key: 'angel' },
  { label: 'Life path', href: '/life-path/', key: 'lifepath' },
  { label: 'Number meanings', href: '/numbers/', key: 'numbers' },
  { label: 'Compatibility', href: '/compatibility/', key: 'compat' },
  { label: 'Articles', href: '/articles/', key: 'articles' },
];

export const TOP_LINKS = [
  { label: 'About', href: '/about/' },
  { label: 'Editorial approach', href: '/editorial-approach/' },
  { label: 'Contact', href: '/contact/' },
];

export const POPULAR = ['111', '222', '333', '444', '555', '777', '1111', '1212'];
