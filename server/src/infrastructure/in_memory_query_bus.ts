import { IQuery, IQueryHandler } from '../application/interfaces/query.interface';
import { IQueryBus } from '../application/interfaces/bus.interface';

export class InMemoryQueryBus implements IQueryBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<string, IQueryHandler<any, any>>();

  register<TQuery extends IQuery, TResult>(
    query_name: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(query_name)) {
      throw new Error(`Query handler for ${query_name} is already registered`);
    }
    this.handlers.set(query_name, handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/require-await
  async execute<TQuery extends IQuery, TResult>(query: TQuery): Promise<TResult> {
    const query_name = query.constructor.name;
    const handler = this.handlers.get(query_name);

    if (!handler) {
      throw new Error(`No handler registered for query: ${query_name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return handler.execute(query);
  }
}
