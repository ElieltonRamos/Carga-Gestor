/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/common/decorators/single-instance.decorator.ts

/**
 * Garante que o método decorado só execute na instância 0 do PM2 (cluster mode).
 * Se NODE_APP_INSTANCE não existir (fora do PM2 ou modo fork único), executa normalmente.
 * Usar em métodos de @Cron para evitar execução duplicada entre instâncias do cluster.
 */
export function SingleInstance() {
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const instance = process.env.NODE_APP_INSTANCE;
      if (instance !== undefined && instance !== '0') {
        return;
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
