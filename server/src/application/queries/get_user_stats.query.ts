import { Server } from 'socket.io';
import { IQuery, IQueryHandler } from '../interfaces/query.interface';
import { getUserStats } from '../../services/socket/stats';

export interface UserStatsResult {
  online_users: number;
  waiting_users: number;
}

export class GetUserStatsQuery implements IQuery {
  constructor(public readonly io: Server) {}
}

export class GetUserStatsQueryHandler implements IQueryHandler<GetUserStatsQuery, UserStatsResult> {
  execute(query: GetUserStatsQuery): UserStatsResult {
    return getUserStats(query.io);
  }
}
