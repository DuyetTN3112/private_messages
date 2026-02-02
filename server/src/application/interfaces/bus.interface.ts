import { ICommand, ICommandHandler } from './command.interface';
import { IQuery, IQueryHandler } from './query.interface';

export interface ICommandBus {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  execute<TCommand extends ICommand, TResult = void>(command: TCommand): Promise<TResult>;
  register<TCommand extends ICommand>(
    command_name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: ICommandHandler<TCommand, any>
  ): void;
}

export interface IQueryBus {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  execute<TQuery extends IQuery, TResult>(query: TQuery): Promise<TResult>;
  register<TQuery extends IQuery, TResult>(
    query_name: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void;
}
