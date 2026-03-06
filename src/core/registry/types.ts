export type PortDirection = 'input' | 'output';

export interface PortSignature {
  name: string;
  direction: PortDirection;
  width: number;
  signed: boolean;
}

export interface ModuleSignature {
  moduleName: string;
  sourcePath?: string;
  ports: PortSignature[];
}
