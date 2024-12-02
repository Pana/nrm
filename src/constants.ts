import os from 'node:os';
import path from 'node:path';
import type { RegistryConfig } from './types.js';

export const REGISTRIES: RegistryConfig = {
  npm: {
    home: 'https://www.npmjs.org',
    registry: 'https://registry.npmjs.org/',
  },
  yarn: {
    home: 'https://yarnpkg.com',
    registry: 'https://registry.yarnpkg.com/',
  },
  tencent: {
    home: 'https://mirrors.tencent.com/npm/',
    registry: 'https://mirrors.tencent.com/npm/',
  },
  cnpm: {
    home: 'https://cnpmjs.org',
    registry: 'https://r.cnpmjs.org/',
  },
  taobao: {
    home: 'https://npmmirror.com',
    registry: 'https://registry.npmmirror.com/',
  },
  npmMirror: {
    home: 'https://skimdb.npmjs.com/',
    registry: 'https://skimdb.npmjs.com/registry/',
  },
  huawei: {
    home: 'https://www.huaweicloud.com/special/npm-jingxiang.html',
    registry: 'https://repo.huaweicloud.com/repository/npm/',
  },
};

export const HOME = 'home';
export const AUTH = '_auth';
export const EMAIL = 'email';
export const REGISTRY = 'registry';
export const REPOSITORY = 'repository';
export const ALWAYS_AUTH = 'always-auth';
export const REGISTRY_ATTRS = [REGISTRY, HOME, AUTH, ALWAYS_AUTH];
export const NRMRC = path.join(os.homedir(), '.nrmrc');
export const NPMRC = path.join(os.homedir(), '.npmrc');
