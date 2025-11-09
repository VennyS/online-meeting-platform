export function mockClass<T extends abstract new (...args: any) => any>(
  cls: T
): jest.Mocked<InstanceType<T>> {
  const prototype = cls.prototype;
  const mocked: any = {};

  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (key === "constructor") continue;
    const desc = Object.getOwnPropertyDescriptor(prototype, key);
    if (desc && typeof desc.value === "function") {
      mocked[key] = jest.fn();
    }
  }

  return mocked;
}

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function mockHook<T extends (...args: any[]) => any>(
  hook: T,
  partial: DeepPartial<ReturnType<T>>
): ReturnType<T> {
  const value = partial as ReturnType<T>;
  (hook as unknown as jest.Mock).mockReturnValue(value);
  return value;
}

export type MockedClass<T extends abstract new (...args: any) => any> =
  ReturnType<typeof mockClass<T>>;
