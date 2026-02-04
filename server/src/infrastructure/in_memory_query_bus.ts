import { IQuery, IQueryHandler } from '../application/interfaces/query.interface';
import { IQueryBus } from '../application/interfaces/bus.interface';

export class InMemoryQueryBus implements IQueryBus {
  private handlers = new Map<string, unknown>();

  register<TQuery extends IQuery, TResult>(
    query_name: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(query_name)) {
      throw new Error(`Query handler for ${query_name} is already registered`);
    }
    this.handlers.set(query_name, handler);
  }

  async execute<TResult>(query: IQuery): Promise<TResult> {
    const query_name = query.constructor.name;
    const handler = this.handlers.get(query_name);

    if (handler === undefined) {
      throw new Error(`No handler registered for query: ${query_name}`);
    }

    return (handler as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(query) as Promise<TResult>;
  }
}
