"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_conversation = void 0;
const conversation_1 = __importDefault(require("../../models/conversation"));
const logger_1 = require("../../utils/logger");
const create_conversation = async (socket_ids) => {
    try {
        const conversation = new conversation_1.default({
            participants: socket_ids,
            is_active: true,
            last_activity: new Date()
        });
        await conversation.save();
        logger_1.logger.info(`Đã tạo cuộc trò chuyện mới giữa ${socket_ids[0]} và ${socket_ids[1]}`);
        return conversation;
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi tạo conversation:', error);
        throw error;
    }
};
exports.create_conversation = create_conversation;
