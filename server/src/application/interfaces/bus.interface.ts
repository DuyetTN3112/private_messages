import { ICommand, ICommandHandler } from './command.interface';
import { IQuery, IQueryHandler } from './query.interface';

export interface ICommandBus {
  execute<TResult = void>(command: ICommand): Promise<TResult>;
  register<TCommand extends ICommand>(
    command_name: string,
    handler: ICommandHandler<TCommand, unknown>
  ): void;
}

export interface IQueryBus {
  execute<TResult>(query: IQuery): Promise<TResult>;
  register<TQuery extends IQuery, TResult>(
    query_name: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void;
}
