export type ActionErrorKind = "content" | "transient";

export type ActionDataState<T> = {
  data?: T;
  error?: string;
  errorKind?: ActionErrorKind;
};
