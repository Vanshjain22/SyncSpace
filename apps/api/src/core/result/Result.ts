/**
 * Result<T, E> monad — railway-oriented error handling for service layers.
 *
 * Instead of throwing exceptions in business logic, services return a Result
 * that is either Ok (success) or Err (failure). This makes error paths explicit,
 * composable, and testable without try/catch pollution.
 *
 * Usage:
 *   // In service:
 *   return Result.ok({ user });
 *   return Result.err(new NotFoundError("User"));
 *
 *   // In controller:
 *   const result = await userService.findById(id);
 *   if (result.isErr()) throw result.error;
 *   res.json(result.value);
 */

type ResultState<T, E> =
  | { readonly _tag: "Ok"; readonly value: T }
  | { readonly _tag: "Err"; readonly error: E };

export class Result<T, E extends Error = Error> {
  private readonly state: ResultState<T, E>;

  private constructor(state: ResultState<T, E>) {
    this.state = state;
  }

  // ─── Constructors ─────────────────────────────────────────────────────────

  static ok<T, E extends Error = Error>(value: T): Result<T, E> {
    return new Result<T, E>({ _tag: "Ok", value });
  }

  static err<T, E extends Error = Error>(error: E): Result<T, E> {
    return new Result<T, E>({ _tag: "Err", error });
  }

  // ─── Type Guards ──────────────────────────────────────────────────────────

  isOk(): this is Result<T, E> & { value: T } {
    return this.state._tag === "Ok";
  }

  isErr(): this is Result<T, E> & { error: E } {
    return this.state._tag === "Err";
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get value(): T {
    if (this.state._tag !== "Ok") {
      throw new Error("Cannot access value of an Err result");
    }
    return this.state.value;
  }

  get error(): E {
    if (this.state._tag !== "Err") {
      throw new Error("Cannot access error of an Ok result");
    }
    return this.state.error;
  }

  // ─── Combinators ─────────────────────────────────────────────────────────

  /**
   * Transforms the Ok value without affecting the Err case.
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.state._tag === "Ok") {
      return Result.ok(fn(this.state.value));
    }
    return Result.err(this.state.error);
  }

  /**
   * Chains a result-returning function on the Ok value (flatMap).
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.state._tag === "Ok") {
      return fn(this.state.value);
    }
    return Result.err(this.state.error);
  }

  /**
   * Returns the Ok value or a provided default.
   */
  getOrElse(defaultValue: T): T {
    return this.state._tag === "Ok" ? this.state.value : defaultValue;
  }

  /**
   * Unwraps the value or throws the error — use only in controller layer.
   */
  unwrap(): T {
    if (this.state._tag === "Ok") {
      return this.state.value;
    }
    throw this.state.error;
  }
}

// Convenience aliases for async service returns
export type AsyncResult<T, E extends Error = Error> = Promise<Result<T, E>>;
