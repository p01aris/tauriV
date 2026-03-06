import type { ModuleSignature } from './types';

export class ModuleRegistry {
  private signatures = new Map<string, ModuleSignature>();

  upsert(signature: ModuleSignature): void {
    this.signatures.set(signature.moduleName, signature);
  }

  replaceAll(signatures: ModuleSignature[]): void {
    this.signatures.clear();
    signatures.forEach((signature) => {
      this.upsert(signature);
    });
  }

  get(moduleName: string): ModuleSignature | undefined {
    return this.signatures.get(moduleName);
  }

  getAll(): ModuleSignature[] {
    return Array.from(this.signatures.values()).sort((a, b) =>
      a.moduleName.localeCompare(b.moduleName)
    );
  }

  has(moduleName: string): boolean {
    return this.signatures.has(moduleName);
  }
}

export const moduleRegistry = new ModuleRegistry();
