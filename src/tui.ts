import pc from "picocolors";

export const printError = (message: string) => {
  console.error(pc.red(message));
};

export const printOk = (message: string) => {
  console.log(pc.green(message));
};

export const printJson = (value: unknown) => {
  console.log(JSON.stringify(value, null, 2));
};
