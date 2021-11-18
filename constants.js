const path = require('path');
const REGISTRIES = require('./registries.json');

const HOME = 'home';
const AUTH = '_auth';
const EMAIL = 'email';
const REGISTRY = 'registry';
const REPOSITORY = 'repository';
const ALWAYS_AUTH = 'always-auth';
const REGISTRY_ATTRS = [REGISTRY, HOME, AUTH, ALWAYS_AUTH];
const NRMRC = path.join(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], '.nrmrc');
const NPMRC = path.join(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], '.npmrc');

module.exports = {
  NRMRC,
  NPMRC,
  REGISTRIES,
  AUTH,
  ALWAYS_AUTH,
  REPOSITORY,
  REGISTRY,
  HOME,
  EMAIL,
  REGISTRY_ATTRS,
};
