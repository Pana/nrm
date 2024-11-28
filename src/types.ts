export interface Registry {
  home: string;
  registry: string;
}

export type RegistryAlias =
  | 'npm'
  | 'yarn'
  | 'tencent'
  | 'cnpm'
  | 'taobao'
  | 'npmMirror'
  | 'huawei';

export type RegistryConfig = Record<RegistryAlias, Registry>;
