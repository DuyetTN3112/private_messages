import { ICommand, ICommandHandler } from '../application/interfaces/command.interface';
import { ICommandBus } from '../application/interfaces/bus.interface';

export class InMemoryCommandBus implements ICommandBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<string, ICommandHandler<any, any>>();

  register<TCommand extends ICommand>(
    command_name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: ICommandHandler<TCommand, any>
  ): void {
    if (this.handlers.has(command_name)) {
      throw new Error(`Command handler for ${command_name} is already registered`);
    }
    this.handlers.set(command_name, handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/require-await
  async execute<TCommand extends ICommand, TResult = void>(
    command: TCommand
  ): Promise<TResult> {
    const command_name = command.constructor.name;
    const handler = this.handlers.get(command_name);

    if (!handler) {
      throw new Error(`No handler registered for command: ${command_name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return handler.execute(command);
  }
}
