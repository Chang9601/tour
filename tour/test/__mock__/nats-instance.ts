export const natsInstance = {
  client: {
    publish: jest
      .fn()
      .mockImplementation(
        (subject: string, data: string, callback: () => void) => {
          callback();
        },
      ),
  },
  connect: jest.fn().mockResolvedValue({
    on: jest.fn(),
    close: jest.fn(),
  }),
};
