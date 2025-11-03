export function mockClass<T extends abstract new (...args: any) => any>(
  cls: T,
): jest.Mocked<InstanceType<T>> {
  const prototype = cls.prototype;
  const mocked: any = {};

  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (key === 'constructor') continue;
    const desc = Object.getOwnPropertyDescriptor(prototype, key);
    if (desc && typeof desc.value === 'function') {
      mocked[key] = jest.fn();
    }
  }

  return mocked;
}

export type MockedClass<T extends abstract new (...args: any) => any> =
  ReturnType<typeof mockClass<T>>;
